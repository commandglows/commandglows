import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../../../core/widgets/app_profile_menu_button.dart';
import '../application/home_feed_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key, this.onOpenSource, this.onGlobalRefresh});

  final ValueChanged<HomeFeedSourceType>? onOpenSource;
  final Future<void> Function()? onGlobalRefresh;

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  static const _allSources = <HomeFeedSourceType>{
    HomeFeedSourceType.voice,
    HomeFeedSourceType.clipboard,
    HomeFeedSourceType.snippet,
    HomeFeedSourceType.dictionary,
  };

  final _searchController = TextEditingController();
  String _searchQuery = '';
  Set<HomeFeedSourceType> _selectedSources = _allSources;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_handleSearchChanged);
  }

  @override
  void dispose() {
    _searchController.removeListener(_handleSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _handleSearchChanged() {
    final next = _searchController.text.trim();
    if (next == _searchQuery) {
      return;
    }
    setState(() => _searchQuery = next);
  }

  Future<void> _refresh() async {
    if (widget.onGlobalRefresh != null) {
      await widget.onGlobalRefresh!();
      return;
    }
    unawaited(ref.refresh(homeFeedProvider.future));
  }

  @override
  Widget build(BuildContext context) {
    final dataAsync = ref.watch(homeFeedProvider);
    final status = dataAsync.when(
      data: (data) {
        if (data.hasTotalFailure) {
          return AppSyncStatus(
            kind: AppSyncStatusKind.error,
            message: 'Toutes les sources sont indisponibles.',
          );
        }
        if (data.hasPartialFailure) {
          return AppSyncStatus(
            kind: AppSyncStatusKind.localOnly,
            message:
                'Sources indisponibles: ${_failureSummary(data.failures).join(', ')}',
          );
        }
        if (data.items.isEmpty) {
          return const AppSyncStatus(
            kind: AppSyncStatusKind.idle,
            message: 'Aucun élément récent pour le moment.',
          );
        }
        return const AppSyncStatus(kind: AppSyncStatusKind.idle);
      },
      error: (_, _) => const AppSyncStatus(
        kind: AppSyncStatusKind.error,
        message: 'Impossible de charger le fil d’accueil.',
      ),
      loading: () => const AppSyncStatus(
        kind: AppSyncStatusKind.loading,
        message: 'Chargement...',
      ),
    );

    return dataAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => ListView(
        padding: AppInsets.screen,
        children: [
          AppEmptyStateCard(
            title: 'Accueil indisponible',
            message: 'Impossible d’afficher le fil global pour le moment.',
            example: '$error',
          ),
        ],
      ),
      data: (data) {
        final filtered = _filteredItems(data.items);
        final hasStatusBanner =
            status.kind == AppSyncStatusKind.error ||
            status.kind == AppSyncStatusKind.localOnly;
        final selectedSourceLabels = _selectedSources
            .map(_sourceChipLabel)
            .toList(growable: false)
            .join(', ');
        return ListView(
          padding: AppInsets.screen,
          children: [
            AppPageHeroCard(
              title: 'Fil d’accueil',
              subtitle:
                  'Ton fil global des dernières entrées de voix, presse-papiers, snippets et dictionnaire.',
              leadingIcon: Icons.dashboard_customize_outlined,
              trailing: const AppProfileMenuButton(),
              metrics: [
                _FeedSourceFilters(
                  visibleSources: const <HomeFeedSourceType>[
                    HomeFeedSourceType.voice,
                    HomeFeedSourceType.clipboard,
                    HomeFeedSourceType.snippet,
                  ],
                  selectedSources: _selectedSources,
                  onChanged: _toggleSource,
                ),
              ],
              searchField: AppSearchField(
                controller: _searchController,
                query: _searchQuery,
                onChanged: (query) {
                  if (query == _searchQuery) {
                    return;
                  }
                  setState(() {
                    _searchQuery = query.trim();
                  });
                },
                onClear: () {
                  _searchController.clear();
                },
                onSubmit: (_) => unawaited(_refresh()),
                scopeLabel: 'Global',
              ),
              syncAction: AppSyncStatusAction(
                status: status,
                onPressed: dataAsync.isLoading ? null : _refresh,
              ),
            ),
            AppGaps.x2,
            if (hasStatusBanner)
              AppBannerCard(
                icon: status.kind == AppSyncStatusKind.error
                    ? Icons.error_outline
                    : Icons.cloud_off_outlined,
                title: status.kind == AppSyncStatusKind.error
                    ? 'Chargement partiellement indisponible'
                    : 'Mode partiellement local',
                message:
                    status.message ??
                    'Certaines sources sont temporairement indisponibles.',
              ),
            if (hasStatusBanner) AppGaps.x2,
            if (data.items.isEmpty)
              _HomeEmptyState(
                onAction: widget.onOpenSource == null
                    ? null
                    : () => widget.onOpenSource!(HomeFeedSourceType.voice),
              )
            else if (filtered.isEmpty)
              _NoSearchResultState(
                onClear: () {
                  _searchController.clear();
                  setState(() => _searchQuery = '');
                },
              )
            else ...[
              AppSectionCard(
                title: 'Résultats récents',
                subtitle:
                    'Sources actives : ${selectedSourceLabels.isEmpty ? 'Toutes' : selectedSourceLabels}',
                padding: AppInsets.compactCard,
                stretch: false,
                child: Column(
                  children: [
                    for (final item in filtered) ...[
                      _HomeFeedTile(
                        item: item,
                        onOpenSource: widget.onOpenSource,
                      ),
                      AppGaps.x1,
                    ],
                  ],
                ),
              ),
            ],
          ],
        );
      },
    );
  }

  String _sourceChipLabel(HomeFeedSourceType source) {
    switch (source) {
      case HomeFeedSourceType.voice:
        return 'Voix';
      case HomeFeedSourceType.clipboard:
        return 'Presse-papiers';
      case HomeFeedSourceType.snippet:
        return 'Snippets';
      case HomeFeedSourceType.dictionary:
        return 'Dictionnaire';
    }
  }

  List<HomeFeedItem> _filteredItems(List<HomeFeedItem> items) {
    final query = _searchQuery.toLowerCase();
    return items
        .where((item) {
          if (!_selectedSources.contains(item.source)) {
            return false;
          }
          if (query.isEmpty) {
            return true;
          }
          final searchable = '${item.title} ${item.excerpt} ${item.typeLabel}'
              .toLowerCase();
          return searchable.contains(query);
        })
        .toList(growable: false);
  }

  void _toggleSource(HomeFeedSourceType source) {
    final next = Set<HomeFeedSourceType>.of(_selectedSources);
    if (next.contains(source)) {
      next.remove(source);
    } else {
      next.add(source);
    }
    if (next.isEmpty) {
      return;
    }
    setState(() => _selectedSources = next);
  }

  List<String> _failureSummary(List<HomeFeedFailure> failures) {
    return failures
        .map((entry) => entry.sourceLabel)
        .toSet()
        .toList(growable: false)
      ..sort((a, b) => a.compareTo(b));
  }
}

class _FeedSourceFilters extends StatelessWidget {
  const _FeedSourceFilters({
    this.visibleSources = const <HomeFeedSourceType>[
      HomeFeedSourceType.voice,
      HomeFeedSourceType.clipboard,
      HomeFeedSourceType.snippet,
      HomeFeedSourceType.dictionary,
    ],
    required this.selectedSources,
    required this.onChanged,
  });

  final List<HomeFeedSourceType> visibleSources;
  final Set<HomeFeedSourceType> selectedSources;
  final ValueChanged<HomeFeedSourceType> onChanged;

  @override
  Widget build(BuildContext context) {
    final labels = <HomeFeedSourceType, String>{
      HomeFeedSourceType.voice: 'Voix',
      HomeFeedSourceType.clipboard: 'Presse-papiers',
      HomeFeedSourceType.snippet: 'Snippets',
      HomeFeedSourceType.dictionary: 'Dictionnaire',
    };

    return Wrap(
      spacing: AppSpacing.x2,
      runSpacing: AppSpacing.x1,
      children: visibleSources
          .map(
            (source) => ChoiceChip(
              label: Text(labels[source]!),
              selected: selectedSources.contains(source),
              onSelected: (_) => onChanged(source),
            ),
          )
          .toList(growable: false),
    );
  }
}

class _HomeFeedTile extends StatelessWidget {
  const _HomeFeedTile({required this.item, required this.onOpenSource});

  final HomeFeedItem item;
  final ValueChanged<HomeFeedSourceType>? onOpenSource;

  @override
  Widget build(BuildContext context) {
    final statusLabel = item.status.statusLabel();
    return AppEntityListTile(
      title: Text(item.title),
      subtitle: Text(
        '${item.typeLabel} · ${_formatShortDateTime(item.timestamp)} · $statusLabel',
      ),
      isThreeLine: true,
      actions: [
        IconButton(
          tooltip: 'Ouvrir',
          onPressed: onOpenSource == null
              ? null
              : () => onOpenSource!(item.source),
          icon: const Icon(Icons.open_in_new_outlined),
        ),
      ],
    );
  }
}

class _HomeEmptyState extends StatelessWidget {
  const _HomeEmptyState({this.onAction});

  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return AppEmptyStateCard(
      title: 'Commence ici',
      message:
          'Ajoute d’abord un contenu dans la Voix, le presse-papiers, '
          'les snippets ou le dictionnaire.',
      actionLabel: 'Aller à la voix',
      onAction: onAction,
    );
  }
}

class _NoSearchResultState extends StatelessWidget {
  const _NoSearchResultState({required this.onClear});

  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return AppEmptyStateCard(
      title: 'Aucun résultat',
      message:
          'La recherche ne correspond à aucune entrée du fil global. Efface le filtre pour reprendre.',
      actionLabel: 'Effacer',
      onAction: onClear,
    );
  }
}

String _formatShortDateTime(DateTime value) {
  final date = value.toLocal();
  return '${date.day.toString().padLeft(2, '0')}/'
      '${date.month.toString().padLeft(2, '0')}/'
      '${date.year.toString()} '
      '${date.hour.toString().padLeft(2, '0')}:'
      '${date.minute.toString().padLeft(2, '0')}';
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/diagnostics/app_diagnostics.dart';
import '../../../core/platform/android_keyboard_bridge.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../../../core/widgets/app_profile_menu_button.dart';
import '../../../core/widgets/confirm_action_dialog.dart';
import '../../settings/application/settings_store_provider.dart';
import '../application/snippet_store_provider.dart';
import '../domain/snippet_store.dart';

class SnippetsScreen extends ConsumerStatefulWidget {
  const SnippetsScreen({super.key});

  @override
  ConsumerState<SnippetsScreen> createState() => _SnippetsScreenState();
}

class _SnippetsScreenState extends ConsumerState<SnippetsScreen> {
  final _triggerController = TextEditingController();
  final _contentController = TextEditingController();
  final _labelController = TextEditingController();
  final _searchController = TextEditingController();
  bool _busy = false;
  String? _message;
  List<SnippetRecord> _items = const [];

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_handleSearchChanged);
    Future<void>.microtask(_load);
  }

  @override
  void dispose() {
    _searchController.removeListener(_handleSearchChanged);
    _triggerController.dispose();
    _contentController.dispose();
    _labelController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _handleSearchChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final store = ref.read(snippetStoreProvider);
      final rows = await store.list();
      await _syncKeyboardRules(rows);
      AppDiagnostics.record(
        'snippet_load',
        'store=${store.runtimeType}; items=${rows.length}',
      );
      if (mounted) {
        setState(() => _items = rows);
      }
    } catch (error) {
      AppDiagnostics.record('snippet_load_error', error);
      if (mounted) {
        setState(() => _message = 'Erreur chargement snippets: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _add() async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final store = ref.read(snippetStoreProvider);
      await store.insert(
        trigger: _triggerController.text,
        content: _contentController.text,
        label: _labelController.text,
      );
      _triggerController.clear();
      _contentController.clear();
      _labelController.clear();
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Insertion snippet impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _edit(SnippetRecord item) async {
    final trigger = TextEditingController(text: item.trigger);
    final content = TextEditingController(text: item.content);
    final label = TextEditingController(text: item.label ?? '');
    final submit = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Modifier le snippet'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: trigger,
                  decoration: const InputDecoration(labelText: 'Déclencheur'),
                ),
                AppGaps.x2,
                TextField(
                  controller: content,
                  minLines: 2,
                  maxLines: 5,
                  decoration: const InputDecoration(labelText: 'Contenu'),
                ),
                AppGaps.x2,
                TextField(
                  controller: label,
                  decoration: const InputDecoration(
                    labelText: 'Libellé (optionnel)',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Enregistrer'),
            ),
          ],
        );
      },
    );

    if (submit != true) {
      trigger.dispose();
      content.dispose();
      label.dispose();
      return;
    }

    setState(() => _busy = true);
    try {
      final store = ref.read(snippetStoreProvider);
      await store.update(
        id: item.id,
        trigger: trigger.text,
        content: content.text,
        label: label.text,
      );
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Mise à jour snippet impossible: $error');
      }
    } finally {
      trigger.dispose();
      content.dispose();
      label.dispose();
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _remove(String id) async {
    final settings = await ref.read(settingsStoreProvider).load();
    if (!mounted) {
      return;
    }
    final confirmed = await showConfirmActionDialog(
      context: context,
      title: 'Supprimer le snippet ?',
      message:
          'Cette action retire le snippet de ta liste de raccourcis texte. Elle ne peut pas être annulée depuis cet écran.',
      confirmLabel: 'Supprimer',
      destructive: true,
      confirmationEnabled: settings.confirmDestructiveActions,
    );
    if (!mounted || !confirmed) {
      return;
    }
    setState(() => _busy = true);
    try {
      final store = ref.read(snippetStoreProvider);
      await store.softDelete(id);
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Suppression snippet impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _syncKeyboardRules(List<SnippetRecord> rows) async {
    try {
      await AndroidKeyboardBridge.setSnippetRules(
        rows
            .map(
              (item) => AndroidKeyboardTextRule(
                trigger: item.trigger,
                replacement: item.content,
                caseSensitive: false,
              ),
            )
            .toList(growable: false),
      );
    } catch (error) {
      AppDiagnostics.record('snippet_keyboard_sync_error', error);
    }
  }

  AppSyncStatus _pageStatus() {
    if (_busy) {
      return const AppSyncStatus(
        kind: AppSyncStatusKind.loading,
        message: 'Chargement des snippets.',
      );
    }
    if (_hasErrorMessage) {
      return AppSyncStatus(kind: AppSyncStatusKind.error, message: _message);
    }
    return const AppSyncStatus(
      kind: AppSyncStatusKind.idle,
      message: 'Liste des snippets prête.',
    );
  }

  bool get _hasErrorMessage {
    final value = _message?.toLowerCase() ?? '';
    return value.contains('erreur') ||
        value.contains('impossible') ||
        value.contains('échec');
  }

  List<SnippetRecord> _visibleItems() {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) {
      return _items;
    }
    return _items
        .where((item) {
          final label = item.label ?? '';
          return item.trigger.toLowerCase().contains(query) ||
              item.content.toLowerCase().contains(query) ||
              label.toLowerCase().contains(query);
        })
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<int>(snippetRefreshSignalProvider, (previous, next) {
      if (previous != null && previous != next) {
        Future<void>.microtask(_load);
      }
    });
    AppDiagnostics.record('screen_build', 'Snippets');
    final visibleItems = _visibleItems();
    final labeledCount = _items
        .where((item) => item.label != null && item.label!.trim().isNotEmpty)
        .length;
    final latest = _items.isEmpty ? null : _items.first;
    return ListView(
      padding: AppInsets.screen,
      children: [
        ProductPageScaffold(
          summary: AppPageHeroCard(
            title: 'Fil snippets',
            subtitle:
                'Retrouve tes derniers snippets, filtre la liste et garde le même point d’entrée que sur l’accueil.',
            leadingIcon: Icons.text_snippet_outlined,
            trailing: const AppProfileMenuButton(),
            metrics: [
              AppStatusPill(status: _pageStatus(), label: 'Statut'),
              AppMetricPill(
                icon: Icons.text_snippet_outlined,
                label: '${_items.length}',
                value: _items.length == 1 ? 'snippet' : 'snippets',
              ),
              AppMetricPill(
                icon: Icons.sell_outlined,
                label: '$labeledCount',
                value: labeledCount == 1 ? 'libellé' : 'libellés',
              ),
              AppMetricPill(
                icon: Icons.schedule,
                label: latest == null
                    ? 'Aucun ajout'
                    : _formatShortDateTime(latest.createdAt),
                value: 'dernier ajout',
              ),
            ],
            searchField: AppSearchField(
              controller: _searchController,
              query: _searchController.text,
              enabled: _items.isNotEmpty,
              scopeLabel: 'Snippets',
              hintText: 'Rechercher un snippet',
              onChanged: (_) {},
              onClear: _searchController.clear,
            ),
            syncAction: AppSyncStatusAction(
              status: _pageStatus(),
              scopeLabel: 'Snippets',
              onPressed: _busy ? null : _load,
            ),
          ),
          primaryAction: AppSectionCard(
            title: 'Nouveau snippet',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppFieldRow(
                  children: [
                    TextField(
                      controller: _triggerController,
                      decoration: const InputDecoration(
                        labelText: 'Déclencheur',
                      ),
                    ),
                    TextField(
                      controller: _labelController,
                      decoration: const InputDecoration(
                        labelText: 'Libellé (optionnel)',
                      ),
                    ),
                  ],
                ),
                AppGaps.x2,
                TextField(
                  controller: _contentController,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'Contenu'),
                ),
                AppGaps.x3,
                AppFormActions(
                  primaryLabel: 'Ajouter le snippet',
                  onPrimary: _busy ? null : _add,
                ),
              ],
            ),
          ),
          busy: _busy,
          message: _message,
          listToolbar: const SizedBox.shrink(),
          results: [
            if (_items.isEmpty)
              const AppEmptyStateCard(
                title: 'Aucun snippet',
                message: 'Aucun raccourci texte pour le moment.',
                example: 'Exemple : `brb` → `Je reviens tout de suite`',
              ),
            if (_items.isNotEmpty && visibleItems.isEmpty)
              const AppEmptyStateCard(
                title: 'Aucun résultat',
                message: 'Aucun snippet ne correspond à cette recherche.',
              ),
            for (final item in visibleItems)
              AppEntityCard(
                title: Text(item.trigger),
                subtitle: Text(item.content),
                bodyMaxLines: 4,
                tags: [
                  if (item.label != null && item.label!.isNotEmpty)
                    AppTag(label: item.label!),
                ],
                actions: [
                  IconButton(
                    tooltip: 'Modifier',
                    onPressed: _busy ? null : () => _edit(item),
                    icon: const Icon(Icons.edit_outlined),
                  ),
                  IconButton(
                    tooltip: 'Supprimer',
                    onPressed: _busy ? null : () => _remove(item.id),
                    icon: const Icon(Icons.delete_outline),
                  ),
                ],
              ),
          ],
        ),
      ],
    );
  }
}

String _formatShortDateTime(DateTime value) {
  final day = value.day.toString().padLeft(2, '0');
  final month = value.month.toString().padLeft(2, '0');
  final hour = value.hour.toString().padLeft(2, '0');
  final minute = value.minute.toString().padLeft(2, '0');
  return '$day/$month $hour:$minute';
}

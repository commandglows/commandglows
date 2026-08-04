import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/diagnostics/app_diagnostics.dart';
import '../../../core/platform/android_keyboard_bridge.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../../../core/widgets/app_profile_menu_button.dart';
import '../../../core/widgets/confirm_action_dialog.dart';
import '../../settings/application/settings_store_provider.dart';
import '../application/dictionary_store_provider.dart';
import '../domain/dictionary_store.dart';

class DictionaryScreen extends ConsumerStatefulWidget {
  const DictionaryScreen({super.key});

  @override
  ConsumerState<DictionaryScreen> createState() => _DictionaryScreenState();
}

class _DictionaryScreenState extends ConsumerState<DictionaryScreen> {
  final _termController = TextEditingController();
  final _replacementController = TextEditingController();
  final _searchController = TextEditingController();
  bool _caseSensitive = false;
  bool _busy = false;
  String? _message;
  List<DictionaryTermRecord> _items = const [];

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_handleSearchChanged);
    Future<void>.microtask(_load);
  }

  @override
  void dispose() {
    _searchController.removeListener(_handleSearchChanged);
    _termController.dispose();
    _replacementController.dispose();
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
      final store = ref.read(dictionaryStoreProvider);
      final rows = await store.list();
      await _syncKeyboardRules(rows);
      AppDiagnostics.record(
        'dictionary_load',
        'store=${store.runtimeType}; items=${rows.length}',
      );
      if (mounted) {
        setState(() => _items = rows);
      }
    } catch (error) {
      AppDiagnostics.record('dictionary_load_error', error);
      if (mounted) {
        setState(
          () => _message = 'Erreur lors du chargement du dictionnaire: $error',
        );
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
      final store = ref.read(dictionaryStoreProvider);
      await store.insert(
        term: _termController.text,
        replacement: _replacementController.text,
        caseSensitive: _caseSensitive,
      );
      _termController.clear();
      _replacementController.clear();
      setState(() => _caseSensitive = false);
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Insertion dictionnaire impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _edit(DictionaryTermRecord item) async {
    final term = TextEditingController(text: item.term);
    final replacement = TextEditingController(text: item.replacement);
    bool caseSensitive = item.caseSensitive;
    final submit = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocalState) {
            return AlertDialog(
              title: const Text('Modifier un terme'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: term,
                      decoration: const InputDecoration(labelText: 'Terme'),
                    ),
                    AppGaps.x2,
                    TextField(
                      controller: replacement,
                      decoration: const InputDecoration(
                        labelText: 'Remplacement',
                      ),
                    ),
                    AppGaps.x2,
                    SwitchListTile(
                      dense: true,
                      contentPadding: AppInsets.none,
                      value: caseSensitive,
                      onChanged: (value) =>
                          setLocalState(() => caseSensitive = value),
                      title: const Text('Respecter la casse'),
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
      },
    );

    if (submit != true) {
      term.dispose();
      replacement.dispose();
      return;
    }

    setState(() => _busy = true);
    try {
      final store = ref.read(dictionaryStoreProvider);
      await store.update(
        id: item.id,
        term: term.text,
        replacement: replacement.text,
        caseSensitive: caseSensitive,
      );
      await _load();
    } catch (error) {
      if (mounted) {
        setState(
          () => _message = 'Mise à jour dictionnaire impossible: $error',
        );
      }
    } finally {
      term.dispose();
      replacement.dispose();
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
      title: 'Supprimer le terme ?',
      message:
          'Cette action retire la règle du dictionnaire personnel. Elle ne peut pas être annulée depuis cet écran.',
      confirmLabel: 'Supprimer',
      destructive: true,
      confirmationEnabled: settings.confirmDestructiveActions,
    );
    if (!mounted || !confirmed) {
      return;
    }
    setState(() => _busy = true);
    try {
      final store = ref.read(dictionaryStoreProvider);
      await store.softDelete(id);
      await _load();
    } catch (error) {
      if (mounted) {
        setState(
          () => _message = 'Suppression terme dictionnaire impossible: $error',
        );
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _syncKeyboardRules(List<DictionaryTermRecord> rows) async {
    try {
      await AndroidKeyboardBridge.setDictionaryRules(
        rows
            .map(
              (item) => AndroidKeyboardTextRule(
                trigger: item.term,
                replacement: item.replacement,
                caseSensitive: item.caseSensitive,
              ),
            )
            .toList(growable: false),
      );
    } catch (error) {
      AppDiagnostics.record('dictionary_keyboard_sync_error', error);
    }
  }

  AppSyncStatus _pageStatus() {
    if (_busy) {
      return const AppSyncStatus(
        kind: AppSyncStatusKind.loading,
        message: 'Chargement du dictionnaire.',
      );
    }
    if (_hasErrorMessage) {
      return AppSyncStatus(kind: AppSyncStatusKind.error, message: _message);
    }
    return const AppSyncStatus(
      kind: AppSyncStatusKind.idle,
      message: 'Dictionnaire prêt.',
    );
  }

  bool get _hasErrorMessage {
    final value = _message?.toLowerCase() ?? '';
    return value.contains('erreur') ||
        value.contains('impossible') ||
        value.contains('échec');
  }

  List<DictionaryTermRecord> _visibleItems() {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) {
      return _items;
    }
    return _items
        .where((item) {
          final caseLabel = item.caseSensitive
              ? 'respecter la casse oui casse sensible'
              : 'respecter la casse non casse ignorée';
          return item.term.toLowerCase().contains(query) ||
              item.replacement.toLowerCase().contains(query) ||
              caseLabel.contains(query);
        })
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    AppDiagnostics.record('screen_build', 'Dictionary');
    final visibleItems = _visibleItems();
    final caseSensitiveCount = _items
        .where((item) => item.caseSensitive)
        .length;
    final latest = _items.isEmpty ? null : _items.first;
    return ListView(
      padding: AppInsets.screen,
      children: [
        ProductPageScaffold(
          summary: AppPageHeroCard(
            title: 'Fil dictionnaire',
            subtitle:
                'Centralise tes termes personnalisés avec le même point d’entrée que sur l’accueil, puis filtre par mot ou règle.',
            leadingIcon: Icons.auto_fix_high_outlined,
            trailing: const AppProfileMenuButton(),
            metrics: [
              AppStatusPill(status: _pageStatus(), label: 'Statut'),
              AppMetricPill(
                icon: Icons.auto_fix_high_outlined,
                label: '${_items.length}',
                value: _items.length == 1 ? 'terme' : 'termes',
              ),
              AppMetricPill(
                icon: Icons.text_fields,
                label: '$caseSensitiveCount',
                value: 'casse stricte',
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
              scopeLabel: 'Dictionnaire',
              hintText: 'Rechercher un terme',
              onChanged: (_) {},
              onClear: _searchController.clear,
            ),
            syncAction: AppSyncStatusAction(
              status: _pageStatus(),
              scopeLabel: 'Dictionnaire',
              onPressed: _busy ? null : _load,
            ),
          ),
          primaryAction: AppSectionCard(
            title: 'Nouveau terme',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppFieldRow(
                  children: [
                    TextField(
                      controller: _termController,
                      decoration: const InputDecoration(labelText: 'Terme'),
                    ),
                    TextField(
                      controller: _replacementController,
                      decoration: const InputDecoration(
                        labelText: 'Remplacement',
                      ),
                    ),
                  ],
                ),
                AppGaps.x2,
                SwitchListTile(
                  contentPadding: AppInsets.none,
                  value: _caseSensitive,
                  onChanged: _busy
                      ? null
                      : (value) => setState(() => _caseSensitive = value),
                  title: const Text('Respecter la casse'),
                ),
                AppFormActions(
                  primaryLabel: 'Ajouter un terme',
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
                title: 'Aucun terme',
                message:
                    'Ajoute un terme personnalisé pour corriger tes expressions récurrentes.',
              ),
            if (_items.isNotEmpty && visibleItems.isEmpty)
              const AppEmptyStateCard(
                title: 'Aucun résultat',
                message: 'Aucun terme ne correspond à cette recherche.',
              ),
            for (final item in visibleItems)
              AppEntityCard(
                title: Text(item.term),
                subtitle: Text(item.replacement),
                bodyMaxLines: 4,
                tags: [
                  AppTag(
                    label: item.caseSensitive
                        ? 'Respecter la casse'
                        : 'Casse flexible',
                  ),
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

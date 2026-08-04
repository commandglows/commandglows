import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';

import '../../../core/diagnostics/app_diagnostics.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../../../core/widgets/app_profile_menu_button.dart';
import '../../../core/widgets/confirm_action_dialog.dart';
import '../../send_to/presentation/send_to_actions.dart';
import '../../settings/application/settings_store_provider.dart';
import '../../snippets/application/snippet_store_provider.dart';
import '../application/clipboard_store_provider.dart';
import '../domain/clipboard_capture_event.dart';
import '../domain/clipboard_normalizer.dart';
import '../domain/clipboard_store.dart';

class ClipboardScreen extends ConsumerStatefulWidget {
  const ClipboardScreen({super.key});

  @override
  ConsumerState<ClipboardScreen> createState() => _ClipboardScreenState();
}

class _ClipboardScreenState extends ConsumerState<ClipboardScreen> {
  final _contentController = TextEditingController();
  final _searchController = TextEditingController();
  ClipboardCanonicalSource _source = ClipboardCanonicalSource.manual;
  bool _busy = false;
  String? _message;
  List<ClipboardItemRecord> _items = const [];

  @override
  void initState() {
    super.initState();
    _contentController.addListener(_handleContentChanged);
    _searchController.addListener(_handleContentChanged);
    Future<void>.microtask(_load);
  }

  @override
  void dispose() {
    _contentController.removeListener(_handleContentChanged);
    _searchController.removeListener(_handleContentChanged);
    _contentController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _handleContentChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _load() async {
    if (!mounted) {
      return;
    }
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final api = ref.read(clipboardHistoryApiProvider);
      final importer = ref.read(keyboardClipboardEventImporterProvider);
      final importResult = await importer.drainFromAndroidKeyboard();
      final rows = await api.listItems();
      AppDiagnostics.record(
        'clipboard_load',
        'api=${api.runtimeType}; items=${rows.length}; imported=${importResult.imported}; failed=${importResult.failed}; rejected_sensitive=${importResult.rejectedSensitive}',
      );
      if (mounted) {
        setState(() {
          _items = rows;
          if (importResult.rejectedSensitive > 0) {
            _message =
                '${importResult.rejectedSensitive} capture(s) sensible(s) ignorée(s).';
          } else if (importResult.failed > 0) {
            _message =
                '${importResult.failed} capture(s) clavier non importée(s).';
          } else if (importResult.imported > 0) {
            _message =
                '${importResult.imported} capture(s) clavier importée(s).';
          }
        });
      }
    } catch (error) {
      AppDiagnostics.record('clipboard_load_error', error);
      if (mounted) {
        setState(() => _message = 'Erreur de chargement du clipboard: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _add() async {
    var sensitiveConfirmed = false;
    final classification = classifySensitiveContent(_contentController.text);
    if (classification != ClipboardSensitiveClassification.none) {
      sensitiveConfirmed = await _confirmSensitiveSave(classification);
      if (!sensitiveConfirmed) {
        return;
      }
    }
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final api = ref.read(clipboardHistoryApiProvider);
      await api.addManualItem(
        content: _contentController.text,
        source: _source,
        sensitiveConfirmed: sensitiveConfirmed,
      );
      _contentController.clear();
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Insertion impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<bool> _confirmSensitiveSave(
    ClipboardSensitiveClassification classification,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Contenu sensible'),
          content: Text(
            'Ce contenu ressemble à: ${classification.label}. Souhaites-tu le sauvegarder dans le clipboard ?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Sauvegarder'),
            ),
          ],
        );
      },
    );
    return confirmed ?? false;
  }

  Future<void> _edit(ClipboardItemRecord item) async {
    final nextContent = await _showEditClipboardItemDialog(item);
    if (nextContent == null || nextContent == item.content) {
      return;
    }
    var sensitiveConfirmed = false;
    final classification = classifySensitiveContent(nextContent);
    if (classification != ClipboardSensitiveClassification.none) {
      sensitiveConfirmed = await _confirmSensitiveSave(classification);
      if (!sensitiveConfirmed) {
        return;
      }
    }
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final api = ref.read(clipboardHistoryApiProvider);
      await api.updateItemContent(
        id: item.id,
        content: nextContent,
        sensitiveConfirmed: sensitiveConfirmed,
      );
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Modification impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<String?> _showEditClipboardItemDialog(ClipboardItemRecord item) async {
    final result = await showDialog<String>(
      context: context,
      builder: (context) =>
          _ClipboardEditItemDialog(initialContent: item.content),
    );
    return result?.trim();
  }

  Future<void> _togglePin(ClipboardItemRecord item) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final api = ref.read(clipboardHistoryApiProvider);
      await api.setPinned(id: item.id, pinned: !item.pinned);
      await _load();
    } catch (error) {
      if (mounted) {
        setState(
          () => _message = 'Échec de la mise à jour du marqueur: $error',
        );
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _copyToSystemClipboard(ClipboardItemRecord item) async {
    await Clipboard.setData(ClipboardData(text: item.content));
    if (mounted) {
      setState(() => _message = 'Élément clipboard copié.');
    }
  }

  Future<void> _sendToSnippet(ClipboardItemRecord item) async {
    final content = item.content.trim();
    if (content.isEmpty) {
      setState(() => _message = 'Aucun contenu clipboard à envoyer.');
      return;
    }

    final draft = await showSendToSnippetDialog(
      context: context,
      initialContent: content,
      sourceLabel: 'Clipboard',
      initialLabel: 'Clipboard',
    );
    if (draft == null || !mounted) {
      return;
    }

    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await ref
          .read(snippetStoreProvider)
          .insert(
            trigger: draft.trigger,
            content: draft.content,
            label: draft.label,
          );
      ref.read(snippetRefreshSignalProvider.notifier).markChanged();
      if (mounted) {
        setState(() => _message = 'Snippet créé depuis le clipboard.');
      }
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Création snippet impossible: $error');
      }
    } finally {
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
      title: 'Supprimer cet élément clipboard ?',
      message:
          'Cette action supprime cet élément de l’historique CMDglows. Il ne peut pas être annulé depuis cet écran.',
      confirmLabel: 'Supprimer',
      destructive: true,
      confirmationEnabled: settings.confirmDestructiveActions,
    );
    if (!mounted || !confirmed) {
      return;
    }
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final api = ref.read(clipboardHistoryApiProvider);
      await api.removeItem(id);
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Suppression impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<int>(clipboardHistoryRefreshSignalProvider, (previous, next) {
      if (previous != null && previous != next) {
        Future<void>.microtask(_load);
      }
    });
    AppDiagnostics.record('screen_build', 'Clipboard');
    final draftContent = _contentController.text.trim();
    final draftClassification = classifySensitiveContent(draftContent);
    final pinnedCount = _items.where((item) => item.pinned).length;
    final pendingCount = _items
        .where((item) => item.syncState == ClipboardSyncState.pending)
        .length;
    final latest = _items.isEmpty ? null : _items.first;
    final visibleItems = _filteredItems();
    return ListView(
      padding: AppInsets.screen,
      children: [
        ProductPageScaffold(
          summary: AppPageHeroCard(
            title: 'Fil presse-papiers',
            subtitle:
          'Retrouve les dernières captures CMDglows, filtre ta liste et garde le même repère que sur l’accueil.',
            leadingIcon: Icons.content_paste_search_outlined,
            trailing: const AppProfileMenuButton(),
            metrics: [
              AppStatusPill(status: _pageStatus(pendingCount), label: 'Statut'),
              AppMetricPill(
                icon: Icons.inventory_2_outlined,
                label: '${_items.length}',
                value: _items.length == 1 ? 'item' : 'items',
              ),
              AppMetricPill(
                icon: Icons.push_pin_outlined,
                label: '$pinnedCount',
                value: pinnedCount == 1 ? 'épinglé' : 'épinglés',
              ),
              AppMetricPill(
                icon: Icons.schedule,
                label: latest == null
                    ? 'Aucune capture'
                    : _formatShortDateTime(latest.lastSeenAt),
                value: 'dernier vu',
              ),
            ],
            searchField: AppSearchField(
              controller: _searchController,
              query: _searchController.text,
              enabled: _items.isNotEmpty,
              scopeLabel: 'Clipboard',
              hintText: 'Rechercher un élément',
              onChanged: (_) {},
              onClear: _searchController.clear,
            ),
            syncAction: AppSyncStatusAction(
              status: _pageStatus(pendingCount),
              scopeLabel: 'Clipboard',
              onPressed: _busy ? null : _load,
            ),
          ),
          primaryAction: AppSectionCard(
            title: 'Nouvel élément',
            leading: Icon(
              Icons.content_paste_go_outlined,
              color: Theme.of(context).colorScheme.primary,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _contentController,
                  minLines: 2,
                  maxLines: 6,
                  textInputAction: TextInputAction.newline,
                  decoration: const InputDecoration(
                    labelText: 'Contenu',
                    hintText: 'Colle un message, un lien ou une commande...',
                  ),
                ),
                AppGaps.x2,
                DropdownButtonFormField<ClipboardCanonicalSource>(
                  initialValue: _source,
                  items: ClipboardCanonicalSource.values
                      .where(
                        (source) =>
                            source == ClipboardCanonicalSource.manual ||
                            source == ClipboardCanonicalSource.system ||
                            source == ClipboardCanonicalSource.keyboard ||
                            source ==
                                ClipboardCanonicalSource.keyboardClipboard,
                      )
                      .map(
                        (source) => DropdownMenuItem(
                          value: source,
                          child: _SourceOption(source: source),
                        ),
                      )
                      .toList(growable: false),
                  onChanged: _busy
                      ? null
                      : (value) => setState(
                          () => _source =
                              value ?? ClipboardCanonicalSource.manual,
                        ),
                  decoration: const InputDecoration(labelText: 'Source'),
                ),
                if (draftClassification !=
                    ClipboardSensitiveClassification.none)
                  Padding(
                    padding: AppInsets.stack,
                    child: _ClipboardInlineNotice(
                      icon: Icons.privacy_tip_outlined,
                      text:
                          'Contenu sensible détecté : ${draftClassification.label}. Une confirmation sera demandée avant la sauvegarde.',
                      destructive: true,
                    ),
                  ),
                AppGaps.x2,
                _DraftStatsRow(content: draftContent, source: _source),
                AppGaps.x2,
                AppFormActions(
                  primaryLabel: 'Ajouter',
                  primaryIcon: Icons.add_link,
                  onPrimary: _busy || draftContent.isEmpty ? null : _add,
                ),
              ],
            ),
          ),
          busy: _busy,
          message: _message,
          messageBuilder: (context, message) =>
              _ClipboardMessage(message: message),
          listToolbar: const SizedBox.shrink(),
          results: [
            if (_items.isEmpty) const _EmptyClipboardState(),
            if (_items.isNotEmpty && visibleItems.isEmpty)
              const _EmptyClipboardSearchState(),
            for (final item in visibleItems)
              _ClipboardItemTile(
                item: item,
                sendToEnabled: !_busy,
                onSendToSnippet: _busy ? null : () => _sendToSnippet(item),
                onCopy: _busy ? null : () => _copyToSystemClipboard(item),
                onEdit: _busy ? null : () => _edit(item),
                onTogglePin: _busy ? null : () => _togglePin(item),
                onDelete: _busy ? null : () => _remove(item.id),
              ),
          ],
        ),
      ],
    );
  }

  List<ClipboardItemRecord> _filteredItems() {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) {
      return _items;
    }
    return _items
        .where((item) {
          final source = _sourceLabel(_sourceFrom(item)).toLowerCase();
          final sync = _syncLabel(item.syncState).toLowerCase();
          return item.content.toLowerCase().contains(query) ||
              source.contains(query) ||
              sync.contains(query);
        })
        .toList(growable: false);
  }

  AppSyncStatus _pageStatus(int pendingCount) {
    if (_busy) {
      return const AppSyncStatus(
        kind: AppSyncStatusKind.loading,
        message: 'Chargement du clipboard.',
      );
    }
    if (_hasErrorMessage) {
      return AppSyncStatus(kind: AppSyncStatusKind.error, message: _message);
    }
    if (pendingCount > 0) {
      return AppSyncStatus(
        kind: AppSyncStatusKind.pending,
        message: '$pendingCount élément(s) en attente de synchronisation.',
      );
    }
    return const AppSyncStatus(
      kind: AppSyncStatusKind.idle,
      message: 'Clipboard prêt.',
    );
  }

  bool get _hasErrorMessage {
    final value = _message?.toLowerCase() ?? '';
    return value.contains('erreur') ||
        value.contains('impossible') ||
        value.contains('échec') ||
        value.contains('failed');
  }
}

class _SourceOption extends StatelessWidget {
  const _SourceOption({required this.source});

  final ClipboardCanonicalSource source;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(_sourceIcon(source), size: 18),
        AppGaps.horizontalX2,
        Flexible(child: Text(_sourceLabel(source))),
      ],
    );
  }
}

class _DraftStatsRow extends StatelessWidget {
  const _DraftStatsRow({required this.content, required this.source});

  final String content;
  final ClipboardCanonicalSource source;

  @override
  Widget build(BuildContext context) {
    final length = content.length;
    final normalizedWords = content.isEmpty
        ? 0
        : content.split(RegExp(r'\s+')).where((word) => word.isNotEmpty).length;
    return Wrap(
      spacing: AppSpacing.x2,
      runSpacing: AppSpacing.x2,
      children: [
        AppTag(label: length == 0 ? 'Vide' : '$length caractère(s)'),
        AppTag(label: '$normalizedWords mot(s)'),
        AppTag(label: _sourceLabel(source)),
      ],
    );
  }
}

class _ClipboardMessage extends StatelessWidget {
  const _ClipboardMessage({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final lower = message.toLowerCase();
    final isError =
        lower.contains('error') ||
        lower.contains('erreur') ||
        lower.contains('impossible') ||
        lower.contains('non importee');
    final accent = isError ? colorScheme.error : colorScheme.primary;
    return Container(
      padding: AppInsets.compactCard,
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: accent.withValues(alpha: 0.24)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isError ? Icons.error_outline : Icons.check_circle_outline,
            color: accent,
          ),
          AppGaps.horizontalX2,
          Expanded(child: Text(message)),
        ],
      ),
    );
  }
}

class _ClipboardInlineNotice extends StatelessWidget {
  const _ClipboardInlineNotice({
    required this.icon,
    required this.text,
    this.destructive = false,
  });

  final IconData icon;
  final String text;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final accent = destructive ? colorScheme.error : colorScheme.primary;
    return Container(
      padding: AppInsets.compactCard,
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: accent.withValues(alpha: 0.22)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: accent),
          AppGaps.horizontalX2,
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

class _ClipboardEditItemDialog extends StatefulWidget {
  const _ClipboardEditItemDialog({required this.initialContent});

  final String initialContent;

  @override
  State<_ClipboardEditItemDialog> createState() =>
      _ClipboardEditItemDialogState();
}

class _ClipboardEditItemDialogState extends State<_ClipboardEditItemDialog> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialContent);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Modifier le contenu'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        minLines: 4,
        maxLines: 8,
        decoration: const InputDecoration(labelText: 'Contenu'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_controller.text),
          child: const Text('Sauvegarder'),
        ),
      ],
    );
  }
}

class _EmptyClipboardState extends StatelessWidget {
  const _EmptyClipboardState();

  @override
  Widget build(BuildContext context) {
    return AppEmptyStateCard(
      title: 'Aucun élément de clipboard',
      message:
          'Tu n’as encore rien enregistré. Ajoute un élément manuellement ou importe les captures clavier depuis Android.',
      example:
          'Exemple : colle un texte utile, puis ouvre le clavier pour une capture auto.',
      actionLabel: null,
      onAction: null,
    );
  }
}

class _EmptyClipboardSearchState extends StatelessWidget {
  const _EmptyClipboardSearchState();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: AppInsets.card,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.search_off, color: colorScheme.primary),
            AppGaps.horizontalX3,
            Expanded(
              child: Text(
                'Aucun item ne correspond à cette recherche.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClipboardItemTile extends StatelessWidget {
  const _ClipboardItemTile({
    required this.item,
    required this.sendToEnabled,
    required this.onSendToSnippet,
    required this.onCopy,
    required this.onEdit,
    required this.onTogglePin,
    required this.onDelete,
  });

  final ClipboardItemRecord item;
  final bool sendToEnabled;
  final VoidCallback? onSendToSnippet;
  final VoidCallback? onCopy;
  final VoidCallback? onEdit;
  final VoidCallback? onTogglePin;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isError = item.syncState == ClipboardSyncState.error;
    return AppEntityCard(
      leading: Icon(
        item.pinned ? Icons.push_pin : _sourceIcon(_sourceFrom(item)),
        color: item.pinned ? colorScheme.primary : null,
      ),
      title: Text(item.content),
      bodyMaxLines: 5,
      tags: [
        AppTag(label: item.sourceLabel),
        AppTag(label: _syncLabel(item.syncState)),
        AppTag(label: 'vu ${_formatShortDateTime(item.lastSeenAt)}'),
        if (item.captureCount > 1)
          AppTag(label: '${item.captureCount} captures'),
        if (item.pinned)
          AppTag(
            label: 'Épinglé',
            color: colorScheme.primary,
            backgroundColor: colorScheme.primary.withValues(alpha: 0.1),
          ),
      ],
      notice: isError && item.syncError != null
          ? _ClipboardInlineNotice(
              icon: Icons.sync_problem_outlined,
              text: item.syncError!,
              destructive: true,
            )
          : null,
      actions: [
        SendToMenu(
          enabled: sendToEnabled,
          targets: const [SendToTarget.snippet],
          onSelected: (target) {
            if (target == SendToTarget.snippet) {
              onSendToSnippet?.call();
            }
          },
        ),
        IconButton(
          tooltip: 'Copier',
          onPressed: onCopy,
          icon: const Icon(Icons.content_copy),
        ),
        IconButton(
          tooltip: 'Modifier',
          onPressed: onEdit,
          icon: const Icon(Icons.edit_outlined),
        ),
        IconButton(
          tooltip: item.pinned ? 'Retirer des épingles' : 'Épingler',
          onPressed: onTogglePin,
          icon: Icon(item.pinned ? Icons.push_pin : Icons.push_pin_outlined),
        ),
        IconButton(
          tooltip: 'Supprimer',
          onPressed: onDelete,
          icon: const Icon(Icons.delete_outline),
        ),
      ],
    );
  }
}

ClipboardCanonicalSource _sourceFrom(ClipboardItemRecord item) {
  return ClipboardCanonicalSource.fromDatabase(item.source);
}

IconData _sourceIcon(ClipboardCanonicalSource source) {
  return switch (source) {
    ClipboardCanonicalSource.manual => Icons.edit_note,
    ClipboardCanonicalSource.voice => Icons.mic_none,
    ClipboardCanonicalSource.overlay => Icons.open_in_new,
    ClipboardCanonicalSource.system => Icons.content_paste,
    ClipboardCanonicalSource.keyboard => Icons.keyboard_alt_outlined,
    ClipboardCanonicalSource.keyboardVoice => Icons.keyboard_voice_outlined,
    ClipboardCanonicalSource.keyboardClipboard => Icons.keyboard_command_key,
  };
}

String _sourceLabel(ClipboardCanonicalSource source) {
  return switch (source) {
    ClipboardCanonicalSource.manual => 'Manuel',
    ClipboardCanonicalSource.voice => 'Voix',
    ClipboardCanonicalSource.overlay => 'Superposition',
    ClipboardCanonicalSource.system => 'Presse-papiers système',
    ClipboardCanonicalSource.keyboard => 'Clavier',
    ClipboardCanonicalSource.keyboardVoice => 'Dictée clavier',
    ClipboardCanonicalSource.keyboardClipboard => 'Clipboard clavier',
  };
}

String _syncLabel(ClipboardSyncState state) {
  return switch (state) {
    ClipboardSyncState.local => 'Local',
    ClipboardSyncState.pending => 'Synchronisation…',
    ClipboardSyncState.synced => 'Synchronisé',
    ClipboardSyncState.error => 'Erreur',
    ClipboardSyncState.deleted => 'Supprimé',
  };
}

String _formatShortDateTime(DateTime value) {
  final local = value.toLocal();
  final day = local.day.toString().padLeft(2, '0');
  final month = local.month.toString().padLeft(2, '0');
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  return '$day/$month $hour:$minute';
}

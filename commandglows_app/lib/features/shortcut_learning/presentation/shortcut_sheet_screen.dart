import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/platform/platform_capabilities.dart';
import '../../../core/platform/shortcut_cheatsheet_bridge.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../application/shortcut_repository_provider.dart';
import '../domain/shortcut_entry.dart';

class ShortcutSheetScreen extends ConsumerStatefulWidget {
  const ShortcutSheetScreen({super.key});

  @override
  ConsumerState<ShortcutSheetScreen> createState() =>
      _ShortcutSheetScreenState();
}

class _ShortcutSheetScreenState extends ConsumerState<ShortcutSheetScreen> {
  final _practiceFocus = FocusNode();
  List<ShortcutEntry> _entries = const [];
  bool _busy = true;
  bool _practicing = false;
  int _cardIndex = 0;
  ShortcutChord? _attempt;
  bool _revealed = false;
  String? _selfAssessment;
  String? _error;
  Map<Object?, Object?> _nativeStatus = const {};

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_load);
  }

  @override
  void dispose() {
    _practiceFocus.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _busy = true);
    try {
      final entries = await ref.read(shortcutRepositoryProvider).list();
      Map<Object?, Object?> nativeStatus = const {};
      if (PlatformCapabilities.isWindows) {
        try {
          nativeStatus = await ShortcutCheatsheetBridge.getStatus();
        } catch (_) {
          // The sheet remains usable from the app if the native host fails.
        }
      }
      if (mounted) {
        setState(() {
          _entries = entries;
          _nativeStatus = nativeStatus;
          _error = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Impossible de charger les raccourcis.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _edit([ShortcutEntry? entry]) async {
    final draft = await showDialog<_ShortcutDraft>(
      context: context,
      builder: (context) => _ShortcutEditorDialog(entry: entry),
    );
    if (draft == null || !mounted) return;
    try {
      await ref
          .read(shortcutRepositoryProvider)
          .save(
            id: entry?.id,
            appName: draft.appName,
            description: draft.description,
            chord: draft.chord,
          );
      await _load();
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Impossible d’enregistrer ce raccourci.');
      }
    }
  }

  Future<void> _delete(ShortcutEntry entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer ce raccourci ?'),
        content: Text('${entry.description} · ${entry.chord.label}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await ref.read(shortcutRepositoryProvider).delete(entry.id);
      await _load();
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Impossible de supprimer ce raccourci.');
      }
    }
  }

  Future<void> _addBuiltIn({
    required String sourceId,
    required String description,
    required String label,
  }) async {
    try {
      await ref
          .read(shortcutRepositoryProvider)
          .upsertSource(
            sourceId: sourceId,
            appName: 'CommandGlows',
            description: description,
            chord: ShortcutChord.fromDisplayLabel(label),
            selfAssessmentOnly: true,
          );
      await _load();
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Impossible d’ajouter ce raccourci.');
      }
    }
  }

  void _startPractice() {
    setState(() {
      _practicing = true;
      _cardIndex = 0;
      _attempt = null;
      _revealed = false;
      _selfAssessment = null;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _practiceFocus.requestFocus();
    });
  }

  void _nextCard() {
    setState(() {
      _cardIndex = (_cardIndex + 1) % _entries.length;
      _attempt = null;
      _revealed = false;
      _selfAssessment = null;
    });
    _practiceFocus.requestFocus();
  }

  KeyEventResult _onPracticeKey(FocusNode node, KeyEvent event) {
    if (_entries[_cardIndex].requiresSelfAssessment) {
      return KeyEventResult.ignored;
    }
    final chord = ShortcutChord.fromKeyEvent(event);
    if (chord == null) return KeyEventResult.ignored;
    setState(() => _attempt = chord);
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes raccourcis'),
        actions: [
          TextButton.icon(
            onPressed: () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/home');
              }
            },
            icon: const Icon(Icons.close),
            label: const Text('Fermer'),
          ),
          TextButton.icon(
            onPressed: () => context.go('/home'),
            icon: const Icon(Icons.home_outlined),
            label: const Text('Accueil'),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 900),
          child: _busy
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  padding: AppInsets.screen,
                  children: [
                    if (_error != null) ...[
                      Text(
                        _error!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                      AppGaps.x2,
                    ],
                    if (_practicing && _entries.isNotEmpty)
                      _practiceCard()
                    else ...[
                      AppSectionCard(
                        title: 'Cheatsheet personnelle',
                        subtitle:
                            'Les raccourcis que tu veux retenir, classés par application.',
                        leading: const Icon(Icons.keyboard_outlined),
                        child: Wrap(
                          spacing: AppSpacing.x2,
                          runSpacing: AppSpacing.x2,
                          children: [
                            if (PlatformCapabilities.isWindows)
                              Text(_nativeAccessMessage()),
                            FilledButton.icon(
                              onPressed: () => _edit(),
                              icon: const Icon(Icons.add),
                              label: const Text('Ajouter un raccourci'),
                            ),
                            if (PlatformCapabilities.isWindows) ...[
                              OutlinedButton.icon(
                                key: const Key(
                                  'add-cheatsheet-hotkey-to-sheet',
                                ),
                                onPressed: () => _addBuiltIn(
                                  sourceId: 'windows:cheatsheet',
                                  description: 'Afficher mes raccourcis',
                                  label: 'Ctrl+Alt+K',
                                ),
                                icon: const Icon(Icons.library_add_outlined),
                                label: const Text(
                                  'Ajouter Ctrl+Alt+K à ma fiche',
                                ),
                              ),
                              OutlinedButton.icon(
                                key: const Key('add-overlay-hotkey-to-sheet'),
                                onPressed: () => _addBuiltIn(
                                  sourceId: 'windows:text-overlay',
                                  description:
                                      'Afficher l’incrustation de texte (si activée)',
                                  label: 'Ctrl+Alt+Espace',
                                ),
                                icon: const Icon(Icons.library_add_outlined),
                                label: const Text(
                                  'Ajouter Ctrl+Alt+Espace à ma fiche',
                                ),
                              ),
                            ],
                            if (_entries.isNotEmpty)
                              OutlinedButton.icon(
                                onPressed: _startPractice,
                                icon: const Icon(Icons.school_outlined),
                                label: const Text('S’entraîner'),
                              ),
                          ],
                        ),
                      ),
                      AppGaps.x3,
                      if (_entries.isEmpty)
                        const Center(
                          child: Text(
                            'Aucun raccourci enregistré pour le moment.',
                          ),
                        ),
                      for (final group in _groups()) ...[
                        AppSectionCard(
                          title: group.key,
                          child: Column(
                            children: [
                              for (final entry in group.value)
                                ListTile(
                                  title: Text(entry.description),
                                  subtitle: Text(entry.chord.label),
                                  trailing: Wrap(
                                    spacing: AppSpacing.x1,
                                    children: [
                                      IconButton(
                                        tooltip: 'Modifier',
                                        onPressed: () => _edit(entry),
                                        icon: const Icon(Icons.edit_outlined),
                                      ),
                                      IconButton(
                                        tooltip: 'Supprimer',
                                        onPressed: () => _delete(entry),
                                        icon: const Icon(Icons.delete_outline),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                        AppGaps.x2,
                      ],
                    ],
                  ],
                ),
        ),
      ),
    );
  }

  List<MapEntry<String, List<ShortcutEntry>>> _groups() {
    final groups = <String, List<ShortcutEntry>>{};
    for (final entry in _entries) {
      final existing = groups.keys.where(
        (name) => name.toLowerCase() == entry.appName.toLowerCase(),
      );
      final name = existing.isEmpty ? entry.appName : existing.first;
      groups.putIfAbsent(name, () => []).add(entry);
    }
    return groups.entries.toList()
      ..sort((a, b) => a.key.toLowerCase().compareTo(b.key.toLowerCase()));
  }

  String _nativeAccessMessage() {
    if (_nativeStatus['supported'] != true) {
      return 'Ouverture Windows indisponible dans cette session. La liste reste accessible ici.';
    }
    final hotkey = _nativeStatus['hotkeyRegistered'] == true
        ? (_nativeStatus['hotkeyLabel'] as String? ?? 'Ctrl+Alt+K')
        : 'Raccourci global indisponible : combinaison déjà utilisée.';
    final tray = _nativeStatus['trayAvailable'] == true
        ? 'Menu de la zone de notification disponible.'
        : 'Icône de la zone de notification indisponible.';
    return '$hotkey · $tray';
  }

  Widget _practiceCard() {
    final entry = _entries[_cardIndex];
    final correct =
        !entry.requiresSelfAssessment &&
        (_attempt?.matches(entry.chord) ?? false);
    return Focus(
      focusNode: _practiceFocus,
      onKeyEvent: _onPracticeKey,
      child: AppSectionCard(
        title: 'Carte ${_cardIndex + 1} / ${_entries.length}',
        subtitle: entry.appName,
        leading: const Icon(Icons.school_outlined),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              entry.description,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            AppGaps.x3,
            Text(
              entry.requiresSelfAssessment
                  ? 'Cette combinaison peut être interceptée par Windows ou par CommandGlows. Essaie-la dans son application, puis évalue-toi ici.'
                  : _attempt == null
                  ? 'Tape le raccourci de mémoire. Clique sur la carte si nécessaire.'
                  : correct
                  ? 'Bravo ! ${_attempt!.label}'
                  : 'Tu as tapé ${_attempt!.label}. Essaie encore ou affiche la réponse.',
            ),
            if (_revealed || correct) ...[
              AppGaps.x2,
              Text('Réponse : ${entry.chord.label}'),
            ],
            if (_selfAssessment != null) ...[
              AppGaps.x2,
              Text(_selfAssessment!),
            ],
            AppGaps.x3,
            Wrap(
              spacing: AppSpacing.x2,
              runSpacing: AppSpacing.x2,
              children: [
                OutlinedButton(
                  onPressed: () {
                    setState(() => _revealed = true);
                    _practiceFocus.requestFocus();
                  },
                  child: const Text('Afficher la réponse'),
                ),
                OutlinedButton(
                  onPressed: () => setState(() {
                    _selfAssessment = 'Réussi : tu as retrouvé le raccourci.';
                    _revealed = true;
                  }),
                  child: const Text('Je l’ai réussi'),
                ),
                OutlinedButton(
                  onPressed: () => setState(() {
                    _selfAssessment = 'À revoir lors du prochain entraînement.';
                    _revealed = true;
                  }),
                  child: const Text('À revoir'),
                ),
                FilledButton(
                  onPressed: _nextCard,
                  child: const Text('Carte suivante'),
                ),
                TextButton(
                  onPressed: () => setState(() => _practicing = false),
                  child: const Text('Terminer'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ShortcutDraft {
  const _ShortcutDraft(this.appName, this.description, this.chord);
  final String appName;
  final String description;
  final ShortcutChord chord;
}

class _ShortcutEditorDialog extends StatefulWidget {
  const _ShortcutEditorDialog({this.entry});
  final ShortcutEntry? entry;

  @override
  State<_ShortcutEditorDialog> createState() => _ShortcutEditorDialogState();
}

class _ShortcutEditorDialogState extends State<_ShortcutEditorDialog> {
  late final _appController = TextEditingController(
    text: widget.entry?.appName ?? '',
  );
  late final _descriptionController = TextEditingController(
    text: widget.entry?.description ?? '',
  );
  final _manualController = TextEditingController();
  final _captureFocus = FocusNode();
  ShortcutChord? _chord;
  String? _error;

  @override
  void initState() {
    super.initState();
    _chord = widget.entry?.chord;
  }

  @override
  void dispose() {
    _appController.dispose();
    _descriptionController.dispose();
    _manualController.dispose();
    _captureFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(
      widget.entry == null ? 'Ajouter un raccourci' : 'Modifier le raccourci',
    ),
    content: SizedBox(
      width: 480,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _appController,
              decoration: const InputDecoration(labelText: 'Application'),
            ),
            AppGaps.x2,
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Action ou description',
              ),
            ),
            AppGaps.x2,
            Focus(
              focusNode: _captureFocus,
              onKeyEvent: (node, event) {
                final chord = ShortcutChord.fromKeyEvent(event);
                if (chord == null) return KeyEventResult.ignored;
                setState(() {
                  _chord = chord;
                  _error = null;
                });
                return KeyEventResult.handled;
              },
              child: OutlinedButton.icon(
                onPressed: _captureFocus.requestFocus,
                icon: const Icon(Icons.keyboard_outlined),
                label: Text(_chord?.label ?? 'Saisir la combinaison'),
              ),
            ),
            AppGaps.x1,
            const Text('Clique puis appuie sur une combinaison de touches.'),
            AppGaps.x2,
            TextField(
              controller: _manualController,
              decoration: const InputDecoration(
                labelText: 'Saisie manuelle si Windows intercepte les touches',
                hintText: 'Win+L ou Alt+Tab',
              ),
            ),
            AppGaps.x1,
            const Text(
              'Une seule combinaison. La saisie manuelle remplace la capture.',
            ),
            if (_error != null) ...[
              AppGaps.x2,
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Annuler'),
      ),
      FilledButton(
        onPressed: () {
          final manual = _manualController.text.trim();
          final chord = manual.isEmpty
              ? _chord
              : ShortcutChord.tryParse(manual);
          if (_appController.text.trim().isEmpty ||
              _descriptionController.text.trim().isEmpty ||
              chord == null) {
            setState(
              () => _error =
                  'Renseigne l’application, l’action et une combinaison valide (ex. Win+L).',
            );
            return;
          }
          Navigator.pop(
            context,
            _ShortcutDraft(
              _appController.text,
              _descriptionController.text,
              chord,
            ),
          );
        },
        child: const Text('Enregistrer'),
      ),
    ],
  );
}

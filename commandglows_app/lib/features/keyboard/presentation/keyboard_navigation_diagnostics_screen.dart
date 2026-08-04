import 'package:flutter/material.dart';

import '../../../core/platform/android_keyboard_bridge.dart';
import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';

class KeyboardNavigationDiagnosticsScreen extends StatefulWidget {
  const KeyboardNavigationDiagnosticsScreen({super.key});

  @override
  State<KeyboardNavigationDiagnosticsScreen> createState() =>
      _KeyboardNavigationDiagnosticsScreenState();
}

class _KeyboardNavigationDiagnosticsScreenState
    extends State<KeyboardNavigationDiagnosticsScreen> {
  final _controller = TextEditingController(
    text:
        'Bonjour. Voici une phrase de test.\n\nDeuxieme paragraphe pour Debut, Fin, Word et Sent.',
  );
  final _focusNode = FocusNode();
  List<AndroidKeyboardNavigationDiagnosticEntry> _entries = const [];
  bool _loading = true;
  bool _clearing = false;
  String? _message;

  static const _sampleCases = <({String label, String value})>[
    (label: 'Phrase simple', value: 'Bonjour le monde. Ceci est un test.'),
    (
      label: 'Paragraphes',
      value: 'Ligne une.\nLigne deux.\n\nParagraphe suivant.',
    ),
    (label: 'Espaces', value: 'mot1  mot2   mot3'),
    (label: 'Ponctuation', value: 'Salut ! Comment ca va ? Tres bien : merci.'),
  ];

  @override
  void initState() {
    super.initState();
    _loadDiagnostics();
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadDiagnostics() async {
    setState(() {
      _loading = true;
      _message = null;
    });
    try {
      final entries = await AndroidKeyboardBridge.getNavigationDiagnostics();
      if (!mounted) {
        return;
      }
      setState(() {
        _entries = entries.reversed.toList(growable: false);
      });
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _message = 'Lecture des diagnostics impossible: ${error.message}';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _clearDiagnostics() async {
    setState(() {
      _clearing = true;
      _message = null;
    });
    try {
      await AndroidKeyboardBridge.clearNavigationDiagnostics();
      if (!mounted) {
        return;
      }
      setState(() {
        _entries = const [];
        _message = 'Journal natif efface.';
      });
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _message = 'Effacement impossible: ${error.message}';
      });
    } finally {
      if (mounted) {
        setState(() => _clearing = false);
      }
    }
  }

  void _applySample(String value) {
    _controller
      ..text = value
      ..selection = TextSelection.collapsed(offset: value.length);
    _focusNode.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final diagnosticsAvailable = PlatformCapabilities.keyboardImeSupported;
    return Scaffold(
      appBar: AppBar(title: const Text('Diagnostic navigation')),
      body: ListView(
        padding: AppInsets.screen,
        children: [
          AppSectionCard(
            title: 'Banc de test',
            subtitle:
                'Utilisez ce champ comme controle CommandGlows, puis revenez ici apres un test dans une autre app pour lire la telemetrie native.',
            leading: const Icon(Icons.science_outlined),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(
                  spacing: AppSpacing.x2,
                  runSpacing: AppSpacing.x2,
                  children: [
                    for (final sample in _sampleCases)
                      OutlinedButton(
                        onPressed: () => _applySample(sample.value),
                        child: Text(sample.label),
                      ),
                  ],
                ),
                AppGaps.x3,
                TextField(
                  key: const Key('keyboard-nav-diagnostics-text-field'),
                  controller: _controller,
                  focusNode: _focusNode,
                  minLines: 5,
                  maxLines: 8,
                  decoration: const InputDecoration(
                    labelText: 'Zone de controle',
                    hintText:
                        'Placez le curseur puis testez les actions du clavier.',
                  ),
                ),
                AppGaps.x3,
                const SelectableText(
                  'Sequence recommandee: DelW←, DelS→, Debut, Fin, All. Repetez dans plusieurs apps cibles, puis revenez lire package, contexte, selection et strategie de fallback.',
                ),
              ],
            ),
          ),
          AppGaps.x3,
          AppSectionCard(
            title: 'Journal natif',
            subtitle: diagnosticsAvailable
                ? 'Dernieres actions IME capturees sur Android.'
                : PlatformCapabilities.keyboardImeUnavailableReason,
            leading: const Icon(Icons.bug_report_outlined),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppActionRail(
                  children: [
                    FilledButton.icon(
                      key: const Key('keyboard-nav-diagnostics-refresh'),
                      onPressed: _loading ? null : _loadDiagnostics,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Actualiser'),
                    ),
                    OutlinedButton.icon(
                      key: const Key('keyboard-nav-diagnostics-clear'),
                      onPressed: _clearing || !diagnosticsAvailable
                          ? null
                          : _clearDiagnostics,
                      icon: const Icon(Icons.delete_outline),
                      label: const Text('Effacer'),
                    ),
                  ],
                ),
                if (_loading) ...[AppGaps.x3, const LinearProgressIndicator()],
                if (_message != null) ...[
                  AppGaps.x3,
                  AppBannerCard(
                    icon: Icons.info_outline,
                    title: 'Etat',
                    message: _message!,
                  ),
                ],
                AppGaps.x3,
                if (_entries.isEmpty)
                  const AppStatusCard(
                    icon: Icons.inbox_outlined,
                    title: 'Aucune entree',
                    subtitle:
                        'Le journal se remplit apres utilisation des actions dans le clavier Android.',
                  )
                else
                  ..._entries.map(_DiagnosticEntryCard.new),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DiagnosticEntryCard extends StatelessWidget {
  const _DiagnosticEntryCard(this.entry);

  final AndroidKeyboardNavigationDiagnosticEntry entry;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final successColor = entry.success
        ? colorScheme.primary
        : colorScheme.error;
    return AppStatusCard(
      icon: entry.success ? Icons.check_circle_outline : Icons.error_outline,
      title: '${_labelForAction(entry.actionId)} · ${entry.packageName}',
      subtitle:
          '${_formatTimestamp(entry.timestamp)} · ${entry.fieldContext} · ${entry.strategy}\n'
          'selection=${entry.selectionStart}:${entry.selectionEnd} '
          'hasSelection=${entry.hasSelection} input=${entry.inputAllowed} '
          'clipboard=${entry.clipboardAllowed} private=${entry.privateMode}\n'
          'before=${_preview(entry.textBeforeCursor)}\n'
          'selected=${_preview(entry.selectedTextBefore)}\n'
          'after=${_preview(entry.textAfterCursor)}',
      trailing: Icon(
        Icons.circle,
        size: AppIconMetrics.sm,
        color: successColor,
      ),
    );
  }

  static String _labelForAction(String actionId) {
    return switch (actionId) {
      'backspace' => 'Del←',
      'forward_delete' => 'Del→',
      'delete_word_before' => 'DelW←',
      'delete_word_after' => 'DelW→',
      'delete_sentence_before' => 'DelS←',
      'delete_sentence_after' => 'DelS→',
      'select_all' => 'All',
      'navigate_word_left' => 'Word←',
      'navigate_word_right' => 'Word→',
      'navigate_sentence_left' => 'Sent←',
      'navigate_sentence_right' => 'Sent→',
      'navigate_line_start' => 'Debut',
      'navigate_line_end' => 'Fin',
      _ => actionId,
    };
  }

  static String _formatTimestamp(DateTime value) {
    final local = value.toLocal();
    final hh = local.hour.toString().padLeft(2, '0');
    final mm = local.minute.toString().padLeft(2, '0');
    final ss = local.second.toString().padLeft(2, '0');
    return '$hh:$mm:$ss';
  }

  static String _preview(String? value) {
    if (value == null || value.isEmpty) {
      return '∅';
    }
    return value.replaceAll('\n', r'\n');
  }
}

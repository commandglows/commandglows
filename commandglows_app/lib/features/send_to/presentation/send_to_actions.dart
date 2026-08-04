import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../clipboard/domain/clipboard_capture_event.dart';

enum SendToTarget { snippet, clipboard }

class SendToMenu extends StatelessWidget {
  const SendToMenu({
    super.key,
    required this.targets,
    required this.onSelected,
    this.enabled = true,
  });

  final List<SendToTarget> targets;
  final ValueChanged<SendToTarget> onSelected;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<SendToTarget>(
      tooltip: 'Envoyer vers',
      enabled: enabled && targets.isNotEmpty,
      icon: const Icon(Icons.ios_share_outlined),
      onSelected: onSelected,
      itemBuilder: (context) {
        return targets
            .map(
              (target) => PopupMenuItem<SendToTarget>(
                value: target,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(_targetIcon(target), size: 20),
                    AppGaps.horizontalX2,
                    Text(_targetLabel(target)),
                  ],
                ),
              ),
            )
            .toList(growable: false);
      },
    );
  }
}

class SendToSnippetDraft {
  const SendToSnippetDraft({
    required this.trigger,
    required this.content,
    required this.label,
  });

  final String trigger;
  final String content;
  final String label;
}

Future<SendToSnippetDraft?> showSendToSnippetDialog({
  required BuildContext context,
  required String initialContent,
  required String sourceLabel,
  String? initialLabel,
}) {
  return showDialog<SendToSnippetDraft>(
    context: context,
    builder: (context) {
      return _SendToSnippetDialog(
        initialContent: initialContent,
        sourceLabel: sourceLabel,
        initialLabel: initialLabel,
      );
    },
  );
}

Future<bool> confirmSensitiveSendToClipboard({
  required BuildContext context,
  required ClipboardSensitiveClassification classification,
}) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) {
      return AlertDialog(
        title: const Text('Contenu sensible'),
        content: Text(
          'Ce texte ressemble à: ${classification.label}. Souhaites-tu quand même l’ajouter au Clipboard CMDglows ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Ajouter'),
          ),
        ],
      );
    },
  );
  return confirmed ?? false;
}

IconData _targetIcon(SendToTarget target) {
  return switch (target) {
    SendToTarget.snippet => Icons.text_snippet_outlined,
    SendToTarget.clipboard => Icons.content_paste_go_outlined,
  };
}

String _targetLabel(SendToTarget target) {
  return switch (target) {
    SendToTarget.snippet => 'Snippet',
    SendToTarget.clipboard => 'Clipboard CMDglows',
  };
}

class _SendToSnippetDialog extends StatefulWidget {
  const _SendToSnippetDialog({
    required this.initialContent,
    required this.sourceLabel,
    this.initialLabel,
  });

  final String initialContent;
  final String sourceLabel;
  final String? initialLabel;

  @override
  State<_SendToSnippetDialog> createState() => _SendToSnippetDialogState();
}

class _SendToSnippetDialogState extends State<_SendToSnippetDialog> {
  late final TextEditingController _triggerController;
  late final TextEditingController _contentController;
  late final TextEditingController _labelController;

  @override
  void initState() {
    super.initState();
    _triggerController = TextEditingController();
    _contentController = TextEditingController(text: widget.initialContent);
    _labelController = TextEditingController(text: widget.initialLabel ?? '');
    _triggerController.addListener(_handleChanged);
    _contentController.addListener(_handleChanged);
  }

  @override
  void dispose() {
    _triggerController.removeListener(_handleChanged);
    _contentController.removeListener(_handleChanged);
    _triggerController.dispose();
    _contentController.dispose();
    _labelController.dispose();
    super.dispose();
  }

  void _handleChanged() {
    setState(() {});
  }

  bool get _canCreate =>
      _triggerController.text.trim().isNotEmpty &&
      _contentController.text.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Créer un snippet'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Source: ${widget.sourceLabel}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            AppGaps.x2,
            TextField(
              controller: _triggerController,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Déclencheur',
                hintText: 'ex. rdv, intro, relance',
              ),
            ),
            AppGaps.x2,
            TextField(
              controller: _contentController,
              minLines: 3,
              maxLines: 8,
              decoration: const InputDecoration(labelText: 'Contenu'),
            ),
            AppGaps.x2,
            TextField(
              controller: _labelController,
              decoration: const InputDecoration(
                labelText: 'Libellé (optionnel)',
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        FilledButton.icon(
          onPressed: _canCreate
              ? () => Navigator.of(context).pop(
                  SendToSnippetDraft(
                    trigger: _triggerController.text,
                    content: _contentController.text,
                    label: _labelController.text,
                  ),
                )
              : null,
          icon: const Icon(Icons.text_snippet_outlined),
          label: const Text('Créer le snippet'),
        ),
      ],
    );
  }
}

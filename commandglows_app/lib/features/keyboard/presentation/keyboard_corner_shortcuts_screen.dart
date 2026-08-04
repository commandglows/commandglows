import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/android_keyboard_bridge.dart';
import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../application/keyboard_sync_providers.dart';
import '../../custom_action_buttons/application/custom_action_button_store_provider.dart';
import '../../custom_action_buttons/domain/custom_action_buttons.dart';
import '../../snippets/application/snippet_store_provider.dart';
import '../../snippets/domain/snippet_store.dart';
import '../domain/keyboard_models.dart';
import 'keyboard_preview_screen.dart';

class KeyboardCornerShortcutsScreen extends ConsumerStatefulWidget {
  const KeyboardCornerShortcutsScreen({super.key});

  @override
  ConsumerState<KeyboardCornerShortcutsScreen> createState() =>
      _KeyboardCornerShortcutsScreenState();
}

class _KeyboardCornerShortcutsScreenState
    extends ConsumerState<KeyboardCornerShortcutsScreen> {
  static const _jsonDialogWidth = 560.0;
  static const _directionSlots = [
    KeyboardCornerSlot.up,
    KeyboardCornerSlot.right,
    KeyboardCornerSlot.down,
    KeyboardCornerSlot.left,
  ];
  static const _cornerSlots = [
    KeyboardCornerSlot.topLeft,
    KeyboardCornerSlot.topRight,
    KeyboardCornerSlot.bottomLeft,
    KeyboardCornerSlot.bottomRight,
  ];

  final _searchController = TextEditingController();
  final _advancedExpressionController = TextEditingController();
  final _advancedLabelController = TextEditingController();
  final _importController = TextEditingController();
  final _previewController = TextEditingController();
  KeyboardCornerDraft _draft = KeyboardCornerDraft.fromConfig(
    AndroidKeyboardCornerConfig.defaults(),
  );
  List<SnippetRecord> _snippets = const [];
  List<CustomActionButtonRecord> _customActionButtons = const [];
  bool _loading = true;
  bool _saving = false;
  bool _privateMode = false;
  String? _message;
  KeyboardLayoutProfile _layoutProfile = KeyboardLayoutProfile.qwerty;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() {}));
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _advancedExpressionController.dispose();
    _advancedLabelController.dispose();
    _importController.dispose();
    _previewController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final status = await AndroidKeyboardBridge.getStatus();
      final config = await AndroidKeyboardBridge.getCornerConfig();
      final snippets = await ref.read(snippetStoreProvider).list();
      final customActionButtons =
          await ref.read(customActionButtonStoreProvider).list();
      if (!mounted) {
        return;
      }
      setState(() {
        _draft = KeyboardCornerDraft.fromConfig(config);
        _layoutProfile = status.layoutProfile;
        _snippets = snippets;
        _customActionButtons = customActionButtons;
        _message = PlatformCapabilities.keyboardImeSupported
            ? 'Loaded. Changes stay in draft until Save.'
            : 'Simulation sur ${PlatformCapabilities.currentPlatformLabel}: ${PlatformCapabilities.keyboardImeUnavailableReason}';
      });
      _syncAdvancedEditor();
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _message =
            'Unable to load native gesture shortcuts (${error.code}): ${error.message}';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _message = 'Unable to load snippets: $error');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _selectKey(String keyId) {
    setState(() {
      _draft = _draft.copyWith(selectedKeyId: keyId);
    });
    _syncAdvancedEditor();
  }

  void _selectSlot(KeyboardCornerSlot slot) {
    setState(() {
      _draft = _draft.copyWith(selectedSlot: slot);
    });
    _syncAdvancedEditor();
  }

  void _setPreset(String presetId) {
    setState(() {
      _draft = _draft.copyWith(
        draftConfig: _draft.draftConfig.copyWith(presetId: presetId),
        validationMessage: null,
      );
      _message = 'Preset changed in draft.';
    });
  }

  void _applyAction(KeyboardGuidedAction action) {
    _applyShortcut(
      action.shortcutFor(
        keyId: _draft.selectedKeyId,
        slot: _draft.selectedSlot,
      ),
      message: '${action.category.label}: ${action.title} added to draft.',
    );
  }

  void _applyShortcut(
    AndroidKeyboardCornerShortcut shortcut, {
    required String message,
  }) {
    final validation = _validateShortcut(shortcut);
    setState(() {
      _draft = validation == null
          ? _draft.applyShortcut(shortcut)
          : _draft.copyWith(validationMessage: validation);
      _message = validation ?? message;
    });
    if (validation == null) {
      _syncAdvancedEditor();
    }
  }

  String? _validateShortcut(AndroidKeyboardCornerShortcut shortcut) {
    if (!KeyboardConfigurableKeyCatalog.containsForProfile(
      _layoutProfile,
      shortcut.keyId,
    )) {
      return 'Unknown key id: ${shortcut.keyId}.';
    }
    if (shortcut.disabled) {
      return null;
    }
    if (shortcut.expression.trim().isEmpty) {
      return 'Expression is required.';
    }
    if ((shortcut.label ?? shortcut.displayLabel).length > 12) {
      return 'Corner label is too long. Keep it under 12 characters.';
    }
    return null;
  }

  Future<void> _saveDraft() async {
    final error = _validateConfig(_draft.draftConfig);
    if (error != null) {
      setState(() {
        _draft = _draft.copyWith(validationMessage: error);
        _message = error;
      });
      return;
    }
    if (!PlatformCapabilities.keyboardImeSupported) {
      setState(() {
        _message =
            'Save disabled here: only Android can persist CommandGlows keyboard IME settings.';
      });
      return;
    }
    setState(() => _saving = true);
    try {
      final saved = await AndroidKeyboardBridge.setCornerConfig(
        _draft.draftConfig,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _draft = KeyboardCornerDraft.fromConfig(saved).copyWith(
          selectedKeyId: _draft.selectedKeyId,
          selectedSlot: _draft.selectedSlot,
        );
        _message = 'Gesture shortcuts saved to Android keyboard.';
      });
      ref
          .read(keyboardSyncChangeNotifierProvider.notifier)
          .markKeyboardProfileChanged();
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _message =
            'Unable to save native config (${error.code}): ${error.message}';
      });
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  String? _validateConfig(AndroidKeyboardCornerConfig config) {
    for (final shortcut in config.overrides) {
      final error = _validateShortcut(shortcut);
      if (error != null) {
        return error;
      }
    }
    return null;
  }

  void _discardDraft() {
    setState(() {
      _draft = _draft.discard();
      _message = 'Draft discarded.';
    });
    _syncAdvancedEditor();
  }

  void _resetCorner() {
    setState(() {
      _draft = _draft.resetCorner(_draft.selectedKeyId, _draft.selectedSlot);
      _message = 'Selected gesture slot cleared in draft.';
    });
    _syncAdvancedEditor();
  }

  Future<void> _resetKey() async {
    final count = _draft.draftConfig.overrides
        .where((shortcut) => shortcut.keyId == _draft.selectedKeyId)
        .length;
    if (count == 0) {
      setState(() => _message = 'This key has no gesture slots to reset.');
      return;
    }
    final confirmed = await _confirm(
      title: 'Reset key?',
      body:
          'This clears $count gesture shortcut(s) from the selected key draft.',
    );
    if (!confirmed || !mounted) {
      return;
    }
    setState(() {
      _draft = _draft.resetKey(_draft.selectedKeyId);
      _message = 'Selected key gesture slots cleared in draft.';
    });
    _syncAdvancedEditor();
  }

  Future<void> _resetAllDraft() async {
    final confirmed = await _confirm(
      title: 'Reset all shortcuts?',
      body:
          'This resets the draft to the selected native preset with no Flutter overrides. Nothing changes in Android until Save.',
    );
    if (!confirmed || !mounted) {
      return;
    }
    setState(() {
      _draft = _draft.copyWith(
        draftConfig: AndroidKeyboardCornerConfig.defaults(),
        validationMessage: null,
      );
      _message = 'Full reset staged in draft.';
    });
    _syncAdvancedEditor();
  }

  Future<bool> _confirm({required String title, required String body}) async {
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(title),
            content: Text(body),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Confirm'),
              ),
            ],
          ),
        ) ??
        false;
  }

  Future<void> _showExportDialog() async {
    final encoded = const JsonEncoder.withIndent(
      '  ',
    ).convert(_draft.draftConfig.toMap());
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Export gesture config'),
        content: SizedBox(
          width: _jsonDialogWidth,
          child: SelectableText(encoded),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _showImportDialog() async {
    _importController.clear();
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Import gesture config'),
        content: SizedBox(
          width: _jsonDialogWidth,
          child: TextField(
            key: const Key('corner-import-json-field'),
            controller: _importController,
            maxLines: 8,
            decoration: const InputDecoration(
              labelText: 'JSON config',
              hintText: '{"version":1,"presetId":"french_accents"...}',
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              _importJson(_importController.text);
              Navigator.of(context).pop();
            },
            child: const Text('Preview import'),
          ),
        ],
      ),
    );
  }

  void _importJson(String raw) {
    if (raw.length > 24000) {
      setState(() => _message = 'Import rejected: JSON is too large.');
      return;
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, Object?> &&
          decoded is! Map<Object?, Object?>) {
        setState(() => _message = 'Import rejected: expected a JSON object.');
        return;
      }
      final map = Map<Object?, Object?>.from(decoded as Map);
      final version = map['version'];
      if (version != null && version != 1) {
        setState(() => _message = 'Import rejected: unknown config version.');
        return;
      }
      final imported = AndroidKeyboardCornerConfig.fromMap(
        map,
      ).copyWith(availablePresets: _draft.draftConfig.availablePresets);
      final error = _validateConfig(imported);
      setState(() {
        _draft = error == null
            ? _draft.copyWith(draftConfig: imported, validationMessage: null)
            : _draft.copyWith(validationMessage: error);
        _message = error ?? 'Import preview staged. Review then Save.';
      });
    } on FormatException {
      setState(() => _message = 'Import rejected: invalid JSON.');
    }
  }

  void _syncAdvancedEditor() {
    final shortcut = _selectedShortcut();
    _advancedExpressionController.text = shortcut?.expression ?? '';
    _advancedLabelController.text = shortcut?.label ?? '';
  }

  AndroidKeyboardCornerShortcut? _selectedShortcut() {
    return _selectedKeyShortcuts()[_draft.selectedSlot];
  }

  Map<KeyboardCornerSlot, AndroidKeyboardCornerShortcut>
  _selectedKeyShortcuts() {
    return KeyboardCornerPresetCatalog.resolvedForKey(
      config: _draft.draftConfig,
      keyId: _draft.selectedKeyId,
      cornersEnabled: true,
      specialKeyCornersEnabled: true,
      privateMode: false,
      specialKey: KeyboardConfigurableKeyCatalog.byIdForProfile(
        _layoutProfile,
        _draft.selectedKeyId,
      ).special,
    );
  }

  void _applyAdvanced() {
    final expression = _advancedExpressionController.text.trim();
    final label = _advancedLabelController.text.trim();
    _applyShortcut(
      AndroidKeyboardCornerShortcut(
        keyId: _draft.selectedKeyId,
        slot: _draft.selectedSlot,
        expression: expression,
        label: label.isEmpty ? null : label,
        sensitive: _looksSensitive(expression),
      ),
      message: 'Advanced expression added to draft.',
    );
  }

  bool _looksSensitive(String expression) {
    final lower = expression.toLowerCase();
    return lower.contains('clipboard') ||
        lower.contains('snippet') ||
        lower.contains('paste') ||
        lower.contains('copy');
  }

  void _simulateSelectedCorner() {
    final shortcut = _selectedShortcut();
    if (shortcut == null) {
      setState(() => _message = 'No shortcut on this gesture slot.');
      return;
    }
    if (_nativeOnly(shortcut.expression)) {
      setState(() {
        _message =
            'Native-only action: ${shortcut.displayLabel}. Android device QA required.';
      });
      return;
    }
    final text = _textFromExpression(shortcut.expression);
    _previewController.text += text;
    setState(() => _message = 'Preview inserted ${shortcut.displayLabel}.');
  }

  bool _nativeOnly(String expression) {
    final lower = expression.toLowerCase();
    return lower.contains('action:') ||
        lower.contains('keyevent:') ||
        lower.contains('modifier:');
  }

  String _textFromExpression(String expression) {
    final separator = expression.indexOf(':');
    final payload = separator > 0
        ? expression.substring(separator + 1)
        : expression;
    final trimmed = payload.trim();
    if (trimmed.startsWith("'") &&
        trimmed.endsWith("'") &&
        trimmed.length > 1) {
      return trimmed
          .substring(1, trimmed.length - 1)
          .replaceAll(r"\'", "'")
          .replaceAll(r'\\', r'\');
    }
    return trimmed;
  }

  @override
  Widget build(BuildContext context) {
    final selectedKey = KeyboardConfigurableKeyCatalog.byIdForProfile(
      _layoutProfile,
      _draft.selectedKeyId,
    );
    final selectedShortcut = _selectedShortcut();
    return PopScope(
      canPop: !_draft.dirty,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop || !_draft.dirty) {
          return;
        }
        final discard = await _confirm(
          title: 'Discard draft?',
          body: 'You have unsaved gesture shortcut changes.',
        );
        if (discard && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Gesture shortcuts'),
          actions: [
            TextButton.icon(
              onPressed: _saving || !_draft.dirty ? null : _discardDraft,
              icon: const Icon(Icons.undo_outlined),
              label: const Text('Discard'),
            ),
            FilledButton.icon(
              onPressed: _saving || !_draft.dirty ? null : _saveDraft,
              icon: const Icon(Icons.save_outlined),
              label: const Text('Save'),
            ),
            AppGaps.horizontalX2,
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: AppInsets.screen,
                children: [
                  _StatusStrip(
                    dirty: _draft.dirty,
                    saving: _saving,
                    message: _message,
                    unsupported: !PlatformCapabilities.keyboardImeSupported,
                  ),
                  AppGaps.x3,
                  _Section(
                    title: 'Preset and preview',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: AppSpacing.x3,
                          runSpacing: AppSpacing.x2,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            SizedBox(
                              width: AppKeyboardStudioMetrics.presetDropdownWidth,
                              child: DropdownButtonFormField<String>(
                                key: const Key('corner-preset-dropdown'),
                                initialValue: _draft.draftConfig.presetId,
                                isExpanded: true,
                                decoration: const InputDecoration(
                                  labelText: 'Draft preset',
                                ),
                                items: [
                                  for (final preset
                                      in _draft.draftConfig.availablePresets)
                                    DropdownMenuItem(
                                      value: preset.id,
                                      child: Text(
                                        preset.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                ],
                                onChanged: _saving
                                    ? null
                                    : (value) {
                                        if (value != null) {
                                          _setPreset(value);
                                        }
                                      },
                              ),
                            ),
                            FilterChip(
                              selected: _privateMode,
                              onSelected: (value) {
                                setState(() {
                                  _privateMode = value;
                                  _message = value
                                      ? 'Private preview: sensitive gestures are shown as blocked.'
                                      : 'Private preview off.';
                                });
                              },
                              avatar: const Icon(Icons.lock_outline),
                              label: const Text('Private preview'),
                            ),
                            OutlinedButton.icon(
                              onPressed: _resetAllDraft,
                              icon: const Icon(Icons.restart_alt_outlined),
                              label: const Text('Reset all draft'),
                            ),
                            OutlinedButton.icon(
                              onPressed: _showExportDialog,
                              icon: const Icon(Icons.ios_share_outlined),
                              label: const Text('Export JSON'),
                            ),
                            OutlinedButton.icon(
                              onPressed: _showImportDialog,
                              icon: const Icon(Icons.data_object_outlined),
                              label: const Text('Import JSON'),
                            ),
                          ],
                        ),
                        AppGaps.x3,
                        KeyboardCornerSelectablePreview(
                          layoutProfile: _layoutProfile,
                          config: _draft.draftConfig,
                          selectedKeyId: _draft.selectedKeyId,
                          selectedSlot: _draft.selectedSlot,
                          privateMode: _privateMode,
                          specialKeyCornersEnabled: true,
                          onKeySelected: _selectKey,
                          onSlotSelected: _selectSlot,
                        ),
                      ],
                    ),
                  ),
                  AppGaps.x3,
                  _Section(
                    title: '${selectedKey.label} gestures',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Directions'),
                        AppGaps.x1,
                        Wrap(
                          spacing: AppSpacing.x2,
                          runSpacing: AppSpacing.x2,
                          children: [
                            for (final slot in _directionSlots)
                              ChoiceChip(
                                key: Key('corner-slot-${slot.name}'),
                                selected: slot == _draft.selectedSlot,
                                onSelected: (_) => _selectSlot(slot),
                                label: Text(
                                  '${_slotLabel(slot)}: ${_shortcutLabel(slot)}',
                                ),
                              ),
                          ],
                        ),
                        AppGaps.x2,
                        const Text('Corners'),
                        AppGaps.x1,
                        Wrap(
                          spacing: AppSpacing.x2,
                          runSpacing: AppSpacing.x2,
                          children: [
                            for (final slot in _cornerSlots)
                              ChoiceChip(
                                key: Key('corner-slot-${slot.name}'),
                                selected: slot == _draft.selectedSlot,
                                onSelected: (_) => _selectSlot(slot),
                                label: Text(
                                  '${_slotLabel(slot)}: ${_shortcutLabel(slot)}',
                                ),
                              ),
                          ],
                        ),
                        AppGaps.x2,
                        _WarningLine(
                          shortcut: selectedShortcut,
                          privateMode: _privateMode,
                          specialKey: selectedKey.special,
                        ),
                        AppGaps.x2,
                        Wrap(
                          spacing: AppSpacing.x2,
                          runSpacing: AppSpacing.x2,
                          children: [
                            OutlinedButton.icon(
                              onPressed: _resetCorner,
                              icon: const Icon(Icons.clear_outlined),
                              label: const Text('Reset slot'),
                            ),
                            OutlinedButton.icon(
                              onPressed: _resetKey,
                              icon: const Icon(Icons.keyboard_return_outlined),
                              label: const Text('Reset key'),
                            ),
                            OutlinedButton.icon(
                              onPressed: _simulateSelectedCorner,
                              icon: const Icon(Icons.play_arrow_outlined),
                              label: const Text('Preview action'),
                            ),
                          ],
                        ),
                        AppGaps.x2,
                        TextField(
                          controller: _previewController,
                          minLines: 2,
                          maxLines: 4,
                          decoration: const InputDecoration(
                            labelText: 'Preview buffer',
                          ),
                        ),
                      ],
                    ),
                  ),
                  AppGaps.x3,
                  _Section(
                    title: 'Action picker',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextField(
                          key: const Key('corner-action-search'),
                          controller: _searchController,
                            decoration: const InputDecoration(
                              prefixIcon: Icon(Icons.search),
                              labelText:
                                  'Search accents, punctuation, gestures, snippets or action buttons',
                            ),
                        ),
                        AppGaps.x3,
                        _ActionCatalog(
                          actions: _filteredActions(),
                          onSelected: _applyAction,
                        ),
            AppGaps.x3,
                        _SnippetCatalog(
                          snippets: _filteredSnippets(),
                          onSelected: (snippet) {
                            _applyAction(
                              KeyboardGuidedAction(
                                category: KeyboardGuidedActionCategory.snippet,
                                title: snippet.label ?? snippet.trigger,
                                expression:
                                    '${snippet.trigger}:${KeyboardGuidedAction.quotedTextExpression(snippet.content)}',
                                label: snippet.trigger,
                                sensitive: true,
                                description:
                                    'Snippet content is inserted by Android keyboard.',
                              ),
                            );
                          },
                        ),
                        AppGaps.x3,
                        _CustomActionButtonCatalog(
                          buttons: _filteredCustomActionButtons(),
                          onSelected: _applyCustomActionButton,
                        ),
                        AppGaps.x3,
                        ExpansionTile(
                          tilePadding: EdgeInsets.zero,
                          title: const Text('Advanced expression'),
                          children: [
                            TextField(
                              key: const Key('corner-advanced-expression'),
                              controller: _advancedExpressionController,
                              decoration: const InputDecoration(
                                labelText: 'KeyboardKeyValue expression',
                                hintText: "action:Undo or label:'text'",
                              ),
                            ),
                            AppGaps.x2,
                            TextField(
                              controller: _advancedLabelController,
                              decoration: const InputDecoration(
                                labelText: 'Short gesture label',
                              ),
                            ),
                            AppGaps.x2,
                            Align(
                              alignment: Alignment.centerLeft,
                              child: FilledButton.icon(
                                onPressed: _applyAdvanced,
                                icon: const Icon(Icons.add_circle_outline),
                                label: const Text('Apply expression'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  List<KeyboardGuidedAction> _filteredActions() {
    final query = _searchController.text.trim().toLowerCase();
    final actions = KeyboardGuidedActionCatalog.defaultActions();
    if (query.isEmpty) {
      return actions;
    }
    return actions
        .where(
          (action) =>
              action.title.toLowerCase().contains(query) ||
              action.expression.toLowerCase().contains(query) ||
              action.category.label.toLowerCase().contains(query),
        )
        .toList(growable: false);
  }

  List<SnippetRecord> _filteredSnippets() {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) {
      return _snippets;
    }
    return _snippets
        .where(
          (snippet) =>
              snippet.trigger.toLowerCase().contains(query) ||
              (snippet.label ?? '').toLowerCase().contains(query) ||
              snippet.content.toLowerCase().contains(query),
        )
        .toList(growable: false);
  }

  List<CustomActionButtonRecord> _filteredCustomActionButtons() {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) {
      return _customActionButtons;
    }
    return _customActionButtons
        .where(
          (button) =>
              button.title.toLowerCase().contains(query) ||
              button.action.value.toLowerCase().contains(query) ||
              button.action.kind.label.toLowerCase().contains(query),
        )
        .toList(growable: false);
  }

  void _applyCustomActionButton(CustomActionButtonRecord button) {
    final expression = button.action.keyboardCornerExpression;
    if (expression == null) {
      setState(() => _message = button.action.keyboardCornerUnsupportedReason);
      return;
    }
    _applyAction(
      KeyboardGuidedAction(
        category: KeyboardGuidedActionCategory.customAction,
        title: button.title,
        expression: expression,
        label: button.title,
        sensitive: button.action.kind == CustomActionKind.clipboardCommand,
        description:
            'Custom action: ${button.action.kind.label} (${button.action.value}).',
      ),
    );
  }

  String _shortcutLabel(KeyboardCornerSlot slot) {
    final shortcut = KeyboardCornerPresetCatalog.resolvedForKey(
      config: _draft.draftConfig,
      keyId: _draft.selectedKeyId,
      cornersEnabled: true,
      specialKeyCornersEnabled: true,
      privateMode: _privateMode,
      specialKey: KeyboardConfigurableKeyCatalog.byIdForProfile(
        _layoutProfile,
        _draft.selectedKeyId,
      ).special,
    )[slot];
    return shortcut?.displayLabel ?? 'tap';
  }

  String _slotLabel(KeyboardCornerSlot slot) {
    return switch (slot) {
      KeyboardCornerSlot.up => 'Up',
      KeyboardCornerSlot.right => 'Right',
      KeyboardCornerSlot.down => 'Down',
      KeyboardCornerSlot.left => 'Left',
      KeyboardCornerSlot.topLeft => 'Top left',
      KeyboardCornerSlot.topRight => 'Top right',
      KeyboardCornerSlot.bottomLeft => 'Bottom left',
      KeyboardCornerSlot.bottomRight => 'Bottom right',
    };
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AppSectionCard(title: title, stretch: false, child: child);
  }
}

class _StatusStrip extends StatelessWidget {
  const _StatusStrip({
    required this.dirty,
    required this.saving,
    required this.unsupported,
    this.message,
  });

  final bool dirty;
  final bool saving;
  final bool unsupported;
  final String? message;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final status = saving
        ? 'Saving native config...'
        : dirty
        ? 'Draft has unsaved changes'
        : 'Saved';
    return AppBannerCard(
      icon: unsupported ? Icons.info_outline : Icons.edit_note_outlined,
      title: status,
      message: message ?? 'Native keyboard draft is in sync with this screen.',
      accentColor: unsupported
          ? colorScheme.error
          : colorScheme.onSurfaceVariant,
    );
  }
}

class _ActionCatalog extends StatelessWidget {
  const _ActionCatalog({required this.actions, required this.onSelected});

  final List<KeyboardGuidedAction> actions;
  final ValueChanged<KeyboardGuidedAction> onSelected;

  @override
  Widget build(BuildContext context) {
    final grouped =
        <KeyboardGuidedActionCategory, List<KeyboardGuidedAction>>{};
    for (final action in actions) {
      grouped.putIfAbsent(action.category, () => []).add(action);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final entry in grouped.entries) ...[
          Text(
            entry.key.label,
            style: Theme.of(
              context,
            ).textTheme.labelLarge?.copyWith(fontWeight: AppFontWeights.bold),
          ),
          AppGaps.x1,
          Wrap(
            spacing: AppSpacing.x2,
            runSpacing: AppSpacing.x2,
            children: [
              for (final action in entry.value)
                ActionChip(
                  key: Key('corner-action-${action.title}'),
                  avatar: action.icon == null ? null : Icon(action.icon),
                  label: Text(action.title),
                  onPressed: () => onSelected(action),
                ),
            ],
          ),
          AppGaps.x3,
        ],
      ],
    );
  }
}

class _SnippetCatalog extends StatelessWidget {
  const _SnippetCatalog({required this.snippets, required this.onSelected});

  final List<SnippetRecord> snippets;
  final ValueChanged<SnippetRecord> onSelected;

  @override
  Widget build(BuildContext context) {
    if (snippets.isEmpty) {
      return const Text('No matching snippets.');
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Snippets',
          style: Theme.of(
            context,
          ).textTheme.labelLarge?.copyWith(fontWeight: AppFontWeights.bold),
        ),
        AppGaps.x1,
        Wrap(
          spacing: AppSpacing.x2,
          runSpacing: AppSpacing.x2,
          children: [
            for (final snippet in snippets)
              ActionChip(
                key: Key('corner-snippet-${snippet.trigger}'),
                label: Text(snippet.label ?? snippet.trigger),
                onPressed: () => onSelected(snippet),
              ),
          ],
        ),
      ],
    );
  }
}

class _CustomActionButtonCatalog extends StatelessWidget {
  const _CustomActionButtonCatalog({
    required this.buttons,
    required this.onSelected,
  });

  final List<CustomActionButtonRecord> buttons;
  final ValueChanged<CustomActionButtonRecord> onSelected;

  @override
  Widget build(BuildContext context) {
    if (buttons.isEmpty) {
      return const Text('No matching action buttons.');
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Action buttons',
          style: Theme.of(context)
              .textTheme
              .labelLarge
              ?.copyWith(fontWeight: AppFontWeights.bold),
        ),
        AppGaps.x1,
        Wrap(
          spacing: AppSpacing.x2,
          runSpacing: AppSpacing.x2,
          children: [
            for (final button in buttons)
              ActionChip(
                key: Key('corner-custom-action-button-${button.title}'),
                avatar: Icon(button.icon.iconData),
                label: Text(button.title),
                onPressed: () => onSelected(button),
              ),
          ],
        ),
      ],
    );
  }
}

class _WarningLine extends StatelessWidget {
  const _WarningLine({
    required this.shortcut,
    required this.privateMode,
    required this.specialKey,
  });

  final AndroidKeyboardCornerShortcut? shortcut;
  final bool privateMode;
  final bool specialKey;

  @override
  Widget build(BuildContext context) {
    final warnings = <String>[];
    if (shortcut == null) {
      warnings.add('Default tap: no gesture action.');
    } else {
      final expression = shortcut!.expression.toLowerCase();
      if (shortcut!.sensitive && privateMode) {
        warnings.add('Blocked in private fields.');
      }
      if (expression.contains('action:') ||
          expression.contains('keyevent:') ||
          expression.contains('modifier:')) {
        warnings.add('Native-only action.');
      }
      if (specialKey) {
        warnings.add('Special-key gestures require the Android setting.');
      }
    }
    return AppBannerCard(
      icon: warnings.isEmpty ? Icons.check_circle_outline : Icons.info_outline,
      title: warnings.isEmpty ? 'Gesture status' : 'Gesture warnings',
      message: warnings.isEmpty
          ? 'Explicit override active without extra warnings.'
          : warnings.join(' '),
      accentColor: warnings.isEmpty
          ? AppColors.success
          : Theme.of(context).colorScheme.onSurfaceVariant,
    );
  }
}

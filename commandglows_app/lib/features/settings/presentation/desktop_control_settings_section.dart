// Windows scan codes are required by the native physical-key binding contract.
// ignore_for_file: deprecated_member_use

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';

import '../../../core/platform/desktop_control_bridge.dart';
import '../../../core/platform/desktop_control_bindings.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../../shortcut_learning/application/shortcut_repository_provider.dart';
import '../../shortcut_learning/data/local_shortcut_repository.dart';
import '../../shortcut_learning/domain/shortcut_entry.dart';

class DesktopControlSettingsSection extends ConsumerStatefulWidget {
  const DesktopControlSettingsSection({super.key, this.preferenceStore});

  final DesktopControlPreference? preferenceStore;

  @override
  ConsumerState<DesktopControlSettingsSection> createState() =>
      _DesktopControlSettingsSectionState();
}

class _DesktopControlSettingsSectionState
    extends ConsumerState<DesktopControlSettingsSection> {
  DesktopControlStatus? _status;
  DesktopControlScope _scope = DesktopControlScope.monitor;
  bool _busy = true;
  String? _message;
  DesktopControlBindings _bindings = DesktopControlBindings.defaults();
  final List<DesktopPhysicalKey> _pendingCloseSequence = [];
  String? _captureTarget;
  String? _captureFeedback;
  final FocusNode _captureFocus = FocusNode();
  final ExpansibleController _bindingsEditorController = ExpansibleController();
  static const _editorExpansionDuration = Duration(milliseconds: 200);

  DesktopControlPreference get _preferences =>
      widget.preferenceStore ?? DesktopControlPreferenceStore();

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  @override
  void dispose() {
    if (_captureTarget == 'closeAppSequence') {
      unawaited(DesktopControlBridge.setCloseAppHotkeyListening(true));
    }
    _captureFocus.dispose();
    _bindingsEditorController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final optedIn = await _preferences.isEnabled();
      final preferredScope = await _preferences.getPreferredScope();
      var savedBindings = await _preferences.getBindings();
      if (savedBindings.migratedFromLegacy) {
        await _preferences.setBindings(savedBindings);
      }
      String? bindingRecoveryMessage = savedBindings.recoveredInvalidData
          ? 'Les touches enregistrées étaient invalides. Les raccourcis par défaut ont été restaurés.'
          : null;
      var status = await DesktopControlBridge.getStatus();
      if (status.supported) {
        status = await DesktopControlBridge.setBindings(savedBindings);
        if (status.errorCode == 'INVALID_BINDINGS') {
          bindingRecoveryMessage =
              'Les touches enregistrées sont refusées : ${status.validationError} Les raccourcis par défaut ont été restaurés.';
          savedBindings = DesktopControlBindings.defaults();
          status = await DesktopControlBridge.setBindings(savedBindings);
          await _preferences.setBindings(savedBindings);
        } else if (status.validationError?.isNotEmpty ?? false) {
          bindingRecoveryMessage = status.validationError;
        } else if (savedBindings.recoveredInvalidData) {
          savedBindings = DesktopControlBindings.defaults();
          await _preferences.setBindings(savedBindings);
        } else if (status.bindings != null) {
          savedBindings = DesktopControlBindings.fromWire(status.bindings);
        }
      }
      if (status.supported && status.preferredScope != preferredScope) {
        status = await DesktopControlBridge.setPreferredScope(preferredScope);
      }
      if (optedIn &&
          status.supported &&
          (!status.enabled || !status.hotkeyRegistered)) {
        status = await DesktopControlBridge.setEnabled(true);
      }
      if (!mounted) return;
      setState(() {
        _status = status;
        _scope = preferredScope;
        _bindings = savedBindings;
        _message = bindingRecoveryMessage ?? _statusMessage(status);
      });
    } on DesktopControlException catch (error) {
      if (!mounted) return;
      setState(() => _message = error.recoveryMessage);
    } catch (_) {
      if (!mounted) return;
      setState(() => _message = _unexpectedErrorMessage);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _setEnabled(bool enabled) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      // Save the explicit choice locally first, so opt-in survives a hotkey
      // collision and can be retried on the next launch.
      await _preferences.setEnabled(enabled);
      final status = await DesktopControlBridge.setEnabled(enabled);
      if (!mounted) return;
      setState(() {
        _status = status;
        _message = _statusMessage(status);
      });
    } on DesktopControlException catch (error) {
      if (!mounted) return;
      setState(() => _message = error.recoveryMessage);
    } catch (_) {
      if (!mounted) return;
      setState(() => _message = _unexpectedErrorMessage);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _setPreferredScope(DesktopControlScope scope) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await _preferences.setPreferredScope(scope);
      final status = await DesktopControlBridge.setPreferredScope(scope);
      if (!mounted) return;
      setState(() {
        _scope = scope;
        _status = status;
        _message = _statusMessage(status);
      });
    } on DesktopControlException catch (error) {
      if (!mounted) return;
      setState(() => _message = error.recoveryMessage);
    } catch (_) {
      if (!mounted) return;
      setState(() => _message = _unexpectedErrorMessage);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _runAction(
    Future<DesktopControlStatus> Function() action,
  ) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final status = await action();
      if (!mounted) return;
      setState(() {
        _status = status;
        _message = _statusMessage(status);
      });
    } on DesktopControlException catch (error) {
      if (!mounted) return;
      setState(() => _message = error.recoveryMessage);
    } catch (_) {
      if (!mounted) return;
      setState(() => _message = _unexpectedErrorMessage);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String? _statusMessage(DesktopControlStatus status) {
    if (status.errorCode != null) {
      return DesktopControlBridge.recoveryMessageFor(status.errorCode!);
    }
    if (!status.supported) {
      return 'Le contrôle du bureau est disponible uniquement dans la version Windows native.';
    }
    if (status.enabled && !status.hotkeyRegistered) {
      return DesktopControlBridge.recoveryMessageFor('HOTKEY_UNAVAILABLE');
    }
    if (!status.closeAppHotkeyRegistered) {
      return DesktopControlBridge.recoveryMessageFor('HOOK_UNAVAILABLE');
    }
    return null;
  }

  static const _unexpectedErrorMessage =
      'Une erreur inattendue a empêché cette action. Relancez CommandGlows puis réessayez.';

  void _capture(String target) {
    setState(() {
      _captureTarget = target;
      _pendingCloseSequence.clear();
      _captureFeedback = target == 'closeAppSequence'
          ? 'Appuyez sur la première touche de la séquence.'
          : 'Appuyez sur une touche ou un raccourci. Échap annule. Les touches de case restent réservées sans modificateur.';
      _message = null;
    });
    if (target == 'closeAppSequence') {
      unawaited(DesktopControlBridge.setCloseAppHotkeyListening(false));
    }
    _captureFocus.requestFocus();
  }

  void _cancelCapture() {
    setState(() {
      _captureTarget = null;
      _pendingCloseSequence.clear();
      _captureFeedback = null;
      _message = 'La capture a été annulée.';
    });
    unawaited(DesktopControlBridge.setCloseAppHotkeyListening(true));
  }

  void _onCaptureKey(RawKeyEvent event) {
    if (_captureTarget == 'closeAppSequence' && event.repeat) {
      return;
    }
    if (_captureTarget == null || event is! RawKeyDownEvent) {
      return;
    }
    if (event.data is! RawKeyEventDataWindows) return;
    final data = event.data as RawKeyEventDataWindows;
    final target = _captureTarget!;
    if (const {
      0x10, 0x11, 0x12, // Generic Shift, Control, Alt
      0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, // Left/right modifiers
      0x5B, 0x5C, // Windows keys
    }.contains(data.keyCode)) {
      return;
    }
    if (data.keyCode == 0x1B && target != 'closeAppSequence') {
      _cancelCapture();
      return;
    }
    final modifiers =
        (event.isControlPressed ? 2 : 0) |
        (event.isAltPressed ? 1 : 0) |
        (event.isShiftPressed ? 4 : 0) |
        (event.isMetaPressed ? 8 : 0);
    final extended = const {
      0x21, // Page up
      0x22, // Page down
      0x23, // End
      0x24, // Home
      0x25, // Left
      0x26, // Up
      0x27, // Right
      0x28, // Down
      0x2D, // Insert
      0x2E, // Delete
      0x5B, // Left Windows
      0x5C, // Right Windows
      0x6F, // Numpad divide
      0xA3, // Right control
      0xA5, // Right alt
    }.contains(data.keyCode);
    final keyLabel = event.logicalKey.keyLabel.trim();
    final fallbackLabel = _virtualKeyLabel(data.keyCode);
    final shiftedDigit =
        modifiers & 4 != 0 && data.scanCode >= 0x02 && data.scanCode <= 0x0B
        ? String.fromCharCode(0x31 + ((data.scanCode - 0x02) % 10))
        : null;
    final resolvedLabel =
        shiftedDigit ??
        (keyLabel.isNotEmpty && !keyLabel.startsWith('Touche')
            ? keyLabel
            : fallbackLabel.startsWith('VK 0x')
            ? null
            : fallbackLabel);
    final binding = DesktopPhysicalKey(
      data.scanCode,
      extended,
      resolvedLabel,
      modifiers,
    );
    if (target == 'closeAppSequence') {
      _pendingCloseSequence.add(binding);
      if (_pendingCloseSequence.length == 1) {
        setState(() {
          _captureFeedback =
              '1/2 : ${binding.displayLabel} — appuyez sur la deuxième touche.';
        });
        return;
      }
      unawaited(
        _saveBindings(
          _bindings.copyWith(closeAppSequence: List.of(_pendingCloseSequence)),
        ),
      );
      return;
    }

    var candidate = _bindings;
    if (target == 'activation') {
      candidate = _bindings.copyWith(
        activationVirtualKey: data.keyCode,
        activationModifiers: modifiers,
      );
    } else {
      final parts = target.split(':');
      final id = parts[0];
      final slot = int.parse(parts[1]);
      final values = [
        ...(_bindings.actions[id] ?? const <DesktopPhysicalKey>[]),
      ];
      if (slot < values.length) {
        values[slot] = binding;
      } else {
        values.add(binding);
      }
      candidate = _bindings.copyWith(
        actions: {..._bindings.actions, id: values},
      );
    }
    final conflict = candidate.localConflict;
    if (conflict != null) {
      setState(() {
        _captureFeedback = conflict;
      });
      return;
    }
    unawaited(_saveBindings(candidate));
  }

  Future<void> _saveBindings(DesktopControlBindings candidate) async {
    final previous = _bindings;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final status = await DesktopControlBridge.setBindings(candidate);
      final nativeError = status.validationError;
      if (nativeError != null && nativeError.isNotEmpty) {
        if (mounted) {
          setState(() {
            _captureFeedback = nativeError;
          });
        }
        return;
      }
      final nativeBindings = status.bindings == null
          ? candidate
          : DesktopControlBindings.fromWire(status.bindings);
      final effectiveBindings = DesktopControlBindings(
        activationVirtualKey: nativeBindings.activationVirtualKey,
        activationModifiers: nativeBindings.activationModifiers,
        closeAppSequence: [
          for (var i = 0; i < nativeBindings.closeAppSequence.length; i++)
            nativeBindings.closeAppSequence[i].label == null &&
                    i < candidate.closeAppSequence.length
                ? DesktopPhysicalKey(
                    nativeBindings.closeAppSequence[i].scanCode,
                    nativeBindings.closeAppSequence[i].extended,
                    candidate.closeAppSequence[i].label,
                    nativeBindings.closeAppSequence[i].modifiers,
                  )
                : nativeBindings.closeAppSequence[i],
        ],
        actions: {
          for (final id in DesktopControlBindings.actionIds)
            id: [
              for (
                var i = 0;
                i < (nativeBindings.actions[id]?.length ?? 0);
                i++
              )
                nativeBindings.actions[id]![i].label == null &&
                        i < (candidate.actions[id]?.length ?? 0)
                    ? DesktopPhysicalKey(
                        nativeBindings.actions[id]![i].scanCode,
                        nativeBindings.actions[id]![i].extended,
                        candidate.actions[id]![i].label,
                        nativeBindings.actions[id]![i].modifiers,
                      )
                    : nativeBindings.actions[id]![i],
            ],
        },
      );
      try {
        await _preferences.setBindings(effectiveBindings);
      } catch (_) {
        await DesktopControlBridge.setBindings(previous);
        rethrow;
      }
      if (mounted) {
        setState(() {
          _bindings = effectiveBindings;
          _status = status;
          _captureTarget = null;
          _captureFeedback = null;
          _pendingCloseSequence.clear();
          _message = _statusMessage(status);
        });
      }
      await DesktopControlBridge.setCloseAppHotkeyListening(true);
      try {
        await _reconcileSheet(effectiveBindings);
      } catch (_) {
        if (mounted) {
          setState(() {
            _message =
                'Touches enregistrées, mais la fiche de raccourcis n’a pas pu être synchronisée.';
          });
        }
      }
    } on DesktopControlException catch (error) {
      if (mounted) {
        setState(() {
          _captureFeedback = error.recoveryMessage;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _captureFeedback =
              'Les touches n’ont pas pu être enregistrées localement. La configuration précédente a été conservée.';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resetAction(String id) async {
    final defaults = DesktopControlBindings.defaults();
    await _saveBindings(
      _bindings.copyWith(
        actions: {
          ..._bindings.actions,
          id: defaults.actions[id] ?? const <DesktopPhysicalKey>[],
        },
      ),
    );
  }

  Future<void> _reconcileSheet(DesktopControlBindings bindings) {
    const appName = 'CommandGlows · Grille du bureau';
    return ref
        .read(shortcutRepositoryProvider)
        .reconcileSources(
          prefix: 'desktop-grid:',
          current: {
            'desktop-grid:activation': ShortcutSourceDraft(
              appName: appName,
              description: 'Afficher ou fermer la grille du bureau',
              chord: ShortcutChord.fromDisplayLabel(
                _activationLabelFor(bindings),
              ),
              selfAssessmentOnly: true,
            ),
            for (final id in DesktopControlBindings.actionIds)
              for (var i = 0; i < (bindings.actions[id]?.length ?? 0); i++)
                'desktop-grid:$id:$i': ShortcutSourceDraft(
                  appName: appName,
                  description:
                      'Grille ouverte : ${DesktopControlBindings.actionLabels[id]!}',
                  chord: ShortcutChord.fromDisplayLabel(
                    bindings.actions[id]![i].displayLabel,
                  ),
                ),
          },
        );
  }

  String get _activationLabel => _activationLabelFor(_bindings);

  String get _closeAppSequenceLabel =>
      _bindings.closeAppSequence.map((key) => key.displayLabel).join(' → ');

  String _activationLabelFor(DesktopControlBindings bindings) {
    final mods = bindings.activationModifiers;
    final parts = <String>[
      if (mods & 2 != 0) 'Ctrl+',
      if (mods & 1 != 0) 'Alt+',
      if (mods & 4 != 0) 'Maj+',
      if (mods & 8 != 0) 'Win+',
      _virtualKeyLabel(bindings.activationVirtualKey),
    ];
    return parts.join();
  }

  String _virtualKeyLabel(int keyCode) {
    if (keyCode >= 0x41 && keyCode <= 0x5A) {
      return String.fromCharCode(keyCode);
    }
    if (keyCode >= 0x30 && keyCode <= 0x39) {
      return String.fromCharCode(keyCode);
    }
    if (keyCode >= 0x70 && keyCode <= 0x87) return 'F${keyCode - 0x6F}';
    return switch (keyCode) {
      0x20 => 'Espace',
      0x1B => 'Échap',
      0x09 => 'Tab',
      0x08 => 'Retour arrière',
      0x21 => 'Page précédente',
      0x22 => 'Page suivante',
      _ => 'VK 0x${keyCode.toRadixString(16)}',
    };
  }

  String _keysFor(String id) => (_bindings.actions[id] ?? const [])
      .map((key) => key.displayLabel)
      .join(' / ');

  Future<void> _addToSheet({
    required String sourceId,
    required String description,
    required String label,
    bool globalHotkey = false,
  }) async {
    setState(() => _busy = true);
    try {
      await ref
          .read(shortcutRepositoryProvider)
          .upsertSource(
            sourceId: sourceId,
            appName: 'CommandGlows · Grille du bureau',
            description: description,
            chord: ShortcutChord.fromDisplayLabel(label),
            selfAssessmentOnly: globalHotkey,
          );
      if (mounted) {
        setState(() => _message = 'Raccourci ajouté à « Mes raccourcis ».');
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _message = 'Impossible d’ajouter ce raccourci à la fiche.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _sheetButton({
    required String sourceId,
    required String description,
    required String label,
    bool globalHotkey = false,
  }) => IconButton(
    key: Key('desktop-control-add-to-sheet-$sourceId'),
    tooltip: 'Ajouter à ma fiche',
    onPressed: _busy
        ? null
        : () => _addToSheet(
            sourceId: sourceId,
            description: description,
            label: label,
            globalHotkey: globalHotkey,
          ),
    icon: const Icon(Icons.library_add_outlined),
  );

  Widget _keyButton(String target, String label) => OutlinedButton(
    key: Key('desktop-control-capture-${target.replaceAll(':', '-')}'),
    onPressed: _busy ? null : () => _capture(target),
    child: Text(_captureTarget == target ? 'Appuyez…' : label),
  );

  Widget _bindingGroup(String title, List<Widget> cards) => Padding(
    padding: AppInsets.compactCard,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleSmall),
        AppGaps.x2,
        AppActionRail(
          minActionWidth: MediaQuery.textScalerOf(context).scale(280),
          children: cards,
        ),
      ],
    ),
  );

  Widget _bindingCard({
    required String id,
    required String title,
    String? description,
    required Widget controls,
    Widget? reset,
    Widget? feedback,
    Widget? extra,
  }) => Card(
    key: Key('desktop-control-binding-card-$id'),
    margin: EdgeInsets.zero,
    child: Padding(
      padding: AppInsets.compactCard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                flex: 3,
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
              AppGaps.x1,
              Flexible(
                flex: 5,
                child: Align(alignment: Alignment.centerRight, child: controls),
              ),
              ?reset,
            ],
          ),
          if (description != null) ...[AppGaps.x1, Text(description)],
          if (extra != null) ...[AppGaps.x1, extra],
          if (feedback != null) ...[AppGaps.x1, feedback],
        ],
      ),
    ),
  );

  Widget _bindingActionCard(String id) => _bindingCard(
    id: id,
    title: DesktopControlBindings.actionLabels[id]!,
    controls: Wrap(
      alignment: WrapAlignment.end,
      spacing: AppSpacing.x1,
      runSpacing: AppSpacing.x1,
      children: [
        for (var i = 0; i < (_bindings.actions[id]?.length ?? 0); i++)
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              _keyButton('$id:$i', _bindings.actions[id]![i].displayLabel),
              _sheetButton(
                sourceId: 'desktop-grid:$id:$i',
                description:
                    'Grille ouverte : ${DesktopControlBindings.actionLabels[id]!}',
                label: _bindings.actions[id]![i].displayLabel,
              ),
              if (id == 'leftClick' && _bindings.actions[id]!.length > 1)
                IconButton(
                  tooltip: 'Retirer ${_bindings.actions[id]![i].displayLabel}',
                  onPressed: _busy
                      ? null
                      : () {
                          final keys = [..._bindings.actions[id]!]..removeAt(i);
                          unawaited(
                            _saveBindings(
                              _bindings.copyWith(
                                actions: {..._bindings.actions, id: keys},
                              ),
                            ),
                          );
                        },
                  icon: const Icon(Icons.remove_circle_outline),
                ),
            ],
          ),
      ],
    ),
    extra: id == 'leftClick' && (_bindings.actions[id]?.length ?? 0) < 2
        ? TextButton.icon(
            onPressed: _busy
                ? null
                : () => _capture('$id:${_bindings.actions[id]?.length ?? 0}'),
            icon: const Icon(Icons.add),
            label: const Text('Ajouter une touche'),
          )
        : null,
    feedback: (_captureTarget?.startsWith('$id:') ?? false)
        ? Text(
            _captureFeedback ?? 'Saisie en cours…',
            key: Key('desktop-control-capture-feedback-$id'),
            style: TextStyle(
              color: _captureFeedback == null
                  ? null
                  : Theme.of(context).colorScheme.error,
            ),
          )
        : null,
    reset: IconButton(
      tooltip: 'Réinitialiser cette action',
      onPressed: _busy ? null : () => _resetAction(id),
      icon: const Icon(Icons.restart_alt),
    ),
  );

  Widget _bindingsEditor() => RawKeyboardListener(
    focusNode: _captureFocus,
    onKey: _onCaptureKey,
    child: ExpansionTile(
      key: const Key('desktop-control-bindings-editor'),
      controller: _bindingsEditorController,
      maintainState: true,
      expansionAnimationStyle: const AnimationStyle(
        duration: _editorExpansionDuration,
        reverseDuration: _editorExpansionDuration,
      ),
      leading: const Icon(Icons.keyboard_alt_outlined),
      title: const Text('Touches et raccourcis'),
      subtitle: const Text(
        'Cliquez sur une touche pour la modifier · Enregistré sur cet appareil',
      ),
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(
            horizontal: AppSpacing.x2,
            vertical: AppSpacing.x1,
          ),
          child: Text(
            'Cliquez sur une touche, puis saisissez son remplacement. Ctrl, Alt et Maj sont acceptés ; Win et les lettres de la grille sans modificateur sont réservés. Échap annule la saisie et ferme la grille. Pour la séquence de fermeture d’application, utilisez Annuler la saisie.',
          ),
        ),
        _bindingGroup('Commandes globales', [
          _bindingCard(
            id: 'activation',
            title: 'Afficher ou fermer la grille',
            controls: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                _keyButton('activation', _activationLabel),
                _sheetButton(
                  sourceId: 'desktop-grid:activation',
                  description: 'Afficher ou fermer la grille du bureau',
                  label: _activationLabel,
                  globalHotkey: true,
                ),
              ],
            ),
            feedback: _captureTarget == 'activation'
                ? Text(
                    _captureFeedback ?? 'Saisie en cours…',
                    key: const Key(
                      'desktop-control-capture-feedback-activation',
                    ),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  )
                : null,
          ),
          _bindingCard(
            id: 'closeAppSequence',
            title: 'Fermer l’application active',
            description:
                'Demande la fermeture de la fenêtre au premier plan. Deux touches dans les 800 ms.',
            controls: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                OutlinedButton(
                  key: const Key('desktop-control-close-app-sequence'),
                  onPressed: _busy ? null : () => _capture('closeAppSequence'),
                  child: Text(
                    _captureTarget == 'closeAppSequence'
                        ? 'Appuyez…'
                        : _closeAppSequenceLabel,
                  ),
                ),
                if (_captureTarget == 'closeAppSequence')
                  TextButton.icon(
                    key: const Key('desktop-control-close-app-cancel-capture'),
                    onPressed: _cancelCapture,
                    icon: const Icon(Icons.close),
                    label: const Text('Annuler la saisie'),
                  ),
              ],
            ),
            reset: IconButton(
              key: const Key('desktop-control-close-app-reset'),
              tooltip: 'Rétablir Échap, Échap',
              onPressed: _busy || _captureTarget == 'closeAppSequence'
                  ? null
                  : () => unawaited(
                      _saveBindings(
                        _bindings.copyWith(
                          closeAppSequence: DesktopControlBindings.defaults()
                              .closeAppSequence,
                        ),
                      ),
                    ),
              icon: const Icon(Icons.restart_alt),
            ),
            feedback: _captureTarget == 'closeAppSequence'
                ? Text(_captureFeedback ?? 'Capture en cours…')
                : null,
          ),
        ]),
        for (final group in const <String, List<String>>{
          'Clics et glisser-déposer': [
            'leftClick',
            'rightClick',
            'middleClick',
            'dragStart',
            'dragRelease',
          ],
          'Défilement et déplacement': [
            'wheelUp',
            'wheelDown',
            'nudgeLeft',
            'nudgeRight',
            'nudgeUp',
            'nudgeDown',
          ],
          'Navigation dans la grille': [
            'back',
            'reset',
            'coordinateView',
            'toggleScope',
            'close',
          ],
          'Écrans': ['previousMonitor', 'nextMonitor'],
        }.entries)
          _bindingGroup(group.key, [
            for (final id in group.value) _bindingActionCard(id),
          ]),
        TextButton.icon(
          key: const Key('desktop-control-bindings-reset-all'),
          onPressed: _busy
              ? null
              : () => _saveBindings(DesktopControlBindings.defaults()),
          icon: const Icon(Icons.restore),
          label: const Text('Tout rétablir par défaut'),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final status = _status;
    final enabled = status?.enabled ?? false;
    final supported = status?.supported ?? false;
    final active = status?.active ?? false;

    return AppSectionCard(
      title: 'Contrôle du bureau',
      subtitle:
          'Pilotez le pointeur dans vos applications Windows avec une grille récursive au clavier.',
      leading: const Icon(Icons.grid_view_rounded),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SwitchListTile(
            key: const Key('desktop-control-enabled'),
            value: enabled,
            onChanged: _busy || !supported ? null : _setEnabled,
            title: const Text('Activer le contrôle du bureau'),
            subtitle: Text(
              'Après activation, $_activationLabel affiche la grille selon la portée choisie. Désactivé au premier lancement.',
            ),
          ),
          if (supported) ...[
            AppGaps.x2,
            InputDecorator(
              decoration: const InputDecoration(
                labelText: 'Portée de la grille',
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<DesktopControlScope>(
                  key: const Key('desktop-control-scope'),
                  value: _scope,
                  isExpanded: true,
                  items: DesktopControlScope.values
                      .map(
                        (scope) => DropdownMenuItem(
                          value: scope,
                          child: Text(scope.label),
                        ),
                      )
                      .toList(),
                  onChanged: _busy
                      ? null
                      : (scope) {
                          if (scope != null) {
                            unawaited(_setPreferredScope(scope));
                          }
                        },
                ),
              ),
            ),
            AppGaps.x2,
            AppBannerCard(
              key: const Key('desktop-control-quick-start'),
              icon: Icons.keyboard_outlined,
              title: 'Premiers pas',
              message:
                  '1. Activez le contrôle du bureau et choisissez la portée de la grille.\n'
                  '2. Dans n’importe quelle application, appuyez sur $_activationLabel pour afficher la grille.\n'
                  '3. Appuyez sur la lettre affichée dans la case visée, répétez pour affiner, puis sur ${_keysFor('leftClick')} pour cliquer.',
            ),
            _bindingsEditor(),
          ],
          ListTile(
            leading: Icon(
              active
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
            ),
            title: const Text('Raccourci global'),
            subtitle: Text(
              !supported
                  ? 'État non disponible.'
                  : status?.hotkeyRegistered == true
                  ? '$_activationLabel est enregistré.'
                  : enabled
                  ? '$_activationLabel n’est pas enregistré.'
                  : '$_activationLabel sera enregistré à l’activation.',
            ),
          ),
          if (_message != null)
            AppBannerCard(
              key: const Key('desktop-control-recovery'),
              icon: Icons.info_outline,
              title: 'Contrôle du bureau',
              message: _message!,
            ),
          if (supported) ...[
            AppGaps.x2,
            AppActionRail(
              children: [
                FilledButton.icon(
                  key: const Key('desktop-control-activate'),
                  onPressed: _busy || !enabled || active
                      ? null
                      : () => _runAction(DesktopControlBridge.activate),
                  icon: const Icon(Icons.grid_on_outlined),
                  label: const Text('Afficher la grille'),
                ),
                OutlinedButton.icon(
                  key: const Key('desktop-control-cancel'),
                  onPressed: _busy || !active
                      ? null
                      : () => _runAction(DesktopControlBridge.cancel),
                  icon: const Icon(Icons.close),
                  label: const Text('Fermer la grille'),
                ),
              ],
            ),
          ],
          if (_busy) ...[AppGaps.x2, const LinearProgressIndicator()],
        ],
      ),
    );
  }
}

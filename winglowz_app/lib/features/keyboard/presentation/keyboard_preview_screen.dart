import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../domain/keyboard_models.dart';

part 'keyboard_preview_widgets.dart';

enum KeyboardPreviewFieldContext {
  text('Text', 'Enter'),
  email('Email', 'Done'),
  url('URL', 'Go'),
  phone('Phone', 'Done'),
  number('Number', 'Done'),
  search('Search', 'Search');

  const KeyboardPreviewFieldContext(this.label, this.enterLabel);

  final String label;
  final String enterLabel;

  bool get numeric => this == phone || this == number;
}

enum KeyboardPreviewPanel {
  none('Typing'),
  navigation('Navigation'),
  accents('Accents'),
  emoji('Emoji'),
  clipboard('Clipboard'),
  clipboardFull('Clip full'),
  snippets('Snippets'),
  media('Media'),
  settings('Settings');

  const KeyboardPreviewPanel(this.label);

  final String label;
}

enum KeyboardPreviewMode {
  letters('ABC'),
  numbers('123'),
  symbols('#+='),
  navigation('Nav');

  const KeyboardPreviewMode(this.label);

  final String label;
}

enum KeyboardPreviewSoundMode {
  off('Muted'),
  short('Click'),
  medium('Tick'),
  long('Clack'),
  extra('Pop');

  const KeyboardPreviewSoundMode(this.label);

  final String label;

  KeyboardPreviewSoundMode get next => switch (this) {
    KeyboardPreviewSoundMode.off => KeyboardPreviewSoundMode.short,
    KeyboardPreviewSoundMode.short => KeyboardPreviewSoundMode.medium,
    KeyboardPreviewSoundMode.medium => KeyboardPreviewSoundMode.long,
    KeyboardPreviewSoundMode.long => KeyboardPreviewSoundMode.extra,
    KeyboardPreviewSoundMode.extra => KeyboardPreviewSoundMode.off,
  };
}

class KeyboardPreviewScreen extends StatefulWidget {
  const KeyboardPreviewScreen({super.key});

  @override
  State<KeyboardPreviewScreen> createState() => _KeyboardPreviewScreenState();
}

class _KeyboardPreviewScreenState extends State<KeyboardPreviewScreen> {
  KeyboardLayoutProfile _profile = KeyboardLayoutProfile.azerty;
  KeyboardPreviewFieldContext _fieldContext = KeyboardPreviewFieldContext.text;
  KeyboardPreviewPanel _panel = KeyboardPreviewPanel.none;
  KeyboardPreviewMode _mode = KeyboardPreviewMode.letters;
  bool _privateMode = false;
  bool _corners = true;
  bool _debug = false;
  bool _vibration = true;
  KeyboardPreviewSoundMode _soundMode = KeyboardPreviewSoundMode.off;
  bool _suggestions = true;
  bool _specialCorners = false;
  bool _french = true;
  bool _english = true;
  bool _shiftEnabled = false;
  AndroidKeyboardCornerConfig _cornerConfig =
      AndroidKeyboardCornerConfig.defaults();
  String? _mediaNowPlaying;
  String _buffer = '';
  int _cursor = 0;
  String _status =
      'Interactive sandbox: simulated output only, not native Android IME proof.';

  KeyboardPreviewMode get _effectiveMode =>
      _fieldContext.numeric ? KeyboardPreviewMode.numbers : _mode;

  void _setStatus(String value) {
    setState(() => _status = value);
  }

  void _setFieldContext(KeyboardPreviewFieldContext value) {
    setState(() {
      _fieldContext = value;
      if (value.numeric) {
        _mode = KeyboardPreviewMode.numbers;
      }
      _status = 'Field context: ${value.label}.';
    });
  }

  void _setPanel(KeyboardPreviewPanel value) {
    setState(() {
      _panel = value;
      _status = value == KeyboardPreviewPanel.none
          ? 'Panel closed.'
          : 'Panel: ${value.label}.';
    });
  }

  void _setMode(KeyboardPreviewMode value) {
    if (_fieldContext.numeric) {
      _setStatus('Mode locked to 123 in numeric context.');
      return;
    }
    setState(() {
      _mode = value;
      _status = 'Mode: ${value.label}.';
    });
  }

  void _clearBuffer() {
    setState(() {
      _buffer = '';
      _cursor = 0;
      _status = 'Buffer cleared.';
    });
  }

  void _resetSandbox() {
    setState(() {
      _buffer = '';
      _cursor = 0;
      _shiftEnabled = false;
      _mediaNowPlaying = null;
      _cornerConfig = AndroidKeyboardCornerConfig.defaults();
      _panel = KeyboardPreviewPanel.none;
      _mode = _fieldContext.numeric
          ? KeyboardPreviewMode.numbers
          : KeyboardPreviewMode.letters;
      _status = 'Sandbox reset.';
    });
  }

  void _insertText(String value, {String? status}) {
    final prefix = _buffer.substring(0, _cursor);
    final suffix = _buffer.substring(_cursor);
    setState(() {
      _buffer = '$prefix$value$suffix';
      _cursor += value.length;
      _status = status ?? 'Inserted "$value".';
    });
  }

  void _insertSuggestion(String value) {
    final suggestion = _shiftEnabled && value.isNotEmpty
        ? '${value[0].toUpperCase()}${value.substring(1)}'
        : value;
    final beforeCursor = _cursor > 0 ? _buffer[_cursor - 1] : '';
    final afterCursor = _cursor < _buffer.length ? _buffer[_cursor] : '';
    final leading = beforeCursor.isEmpty || beforeCursor.trim().isEmpty
        ? ''
        : ' ';
    final trailing = afterCursor.isEmpty || afterCursor.trim().isEmpty
        ? ''
        : ' ';
    _insertText(
      '$leading$suggestion$trailing',
      status: 'Suggestion "$value" inserted.',
    );
    setState(() => _shiftEnabled = false);
  }

  void _backspace() {
    if (_cursor == 0) {
      _setStatus('Backspace ignored: buffer already empty.');
      return;
    }
    final prefix = _buffer.substring(0, _cursor - 1);
    final suffix = _buffer.substring(_cursor);
    setState(() {
      _buffer = '$prefix$suffix';
      _cursor -= 1;
      _status = 'Backspace.';
    });
  }

  void _onKeyPressed(KeyboardPreviewKey key) {
    if (!key.enabled) {
      _setStatus('Action disabled in this context: ${key.label}.');
      return;
    }
    switch (key.action) {
      case KeyboardPreviewKeyAction.modeSwitch:
        if (key.modeTarget != null) {
          _setMode(key.modeTarget!);
        }
        break;
      case KeyboardPreviewKeyAction.panelSwitch:
        if (key.panelTarget == null) {
          break;
        }
        final target = key.panelTarget!;
        if (target == KeyboardPreviewPanel.clipboard &&
            (_panel == KeyboardPreviewPanel.clipboard ||
                _panel == KeyboardPreviewPanel.clipboardFull)) {
          _setPanel(KeyboardPreviewPanel.none);
          return;
        }
        if (_panel == target) {
          _setPanel(KeyboardPreviewPanel.none);
          return;
        }
        _setPanel(target);
        break;
      case KeyboardPreviewKeyAction.closePanel:
        _setPanel(KeyboardPreviewPanel.none);
        break;
      case KeyboardPreviewKeyAction.clipboardEntry:
        _insertText(
          key.output ?? key.label,
          status: 'Clipboard entry inserted.',
        );
        break;
      case KeyboardPreviewKeyAction.shift:
        setState(() {
          _shiftEnabled = !_shiftEnabled;
          _status = _shiftEnabled ? 'Shift enabled.' : 'Shift disabled.';
        });
        break;
      case KeyboardPreviewKeyAction.space:
        _insertText(' ', status: 'Space inserted.');
        break;
      case KeyboardPreviewKeyAction.backspace:
        _backspace();
        break;
      case KeyboardPreviewKeyAction.enter:
        _insertText('\n', status: 'Enter inserted.');
        break;
      case KeyboardPreviewKeyAction.mediaNowPlaying:
        setState(() {
          if (_mediaNowPlaying == null) {
            _mediaNowPlaying = 'Daft Punk - Digital Love';
            _status = _mediaNowPlaying!;
          } else {
            _mediaNowPlaying = null;
            _status = 'Now playing hidden.';
          }
        });
        break;
      case KeyboardPreviewKeyAction.openMediaApp:
        _setStatus('Would open the current media app on Android.');
        break;
      case KeyboardPreviewKeyAction.keyboardPicker:
        _setStatus('Keyboard picker is Android-only.');
        break;
      case KeyboardPreviewKeyAction.openAppSettings:
        _setStatus('Would open CommandGlows settings on Android.');
        break;
      case KeyboardPreviewKeyAction.openThemeSettings:
        _setStatus('Would open CommandGlows appearance settings on Android.');
        break;
      case KeyboardPreviewKeyAction.toggleVibration:
        setState(() {
          _vibration = !_vibration;
          _status = _vibration ? 'Key vibration on.' : 'Key vibration off.';
        });
        break;
      case KeyboardPreviewKeyAction.toggleSound:
        setState(() {
          _soundMode = _soundMode.next;
          _status = _soundMode == KeyboardPreviewSoundMode.off
              ? 'Key sound off.'
              : 'Key sound ${_soundMode.label}.';
        });
        break;
      case KeyboardPreviewKeyAction.toggleSuggestions:
        setState(() {
          _suggestions = !_suggestions;
          _status = _suggestions ? 'Suggestions on.' : 'Suggestions off.';
        });
        break;
      case KeyboardPreviewKeyAction.toggleSpecialCorners:
        setState(() {
          _specialCorners = !_specialCorners;
          _status = _specialCorners
              ? 'Special key gestures on.'
              : 'Special key gestures off.';
        });
        break;
      case KeyboardPreviewKeyAction.toggleFrench:
        setState(() {
          _french = !_french;
          _status = _french ? 'French enabled.' : 'French disabled.';
        });
        break;
      case KeyboardPreviewKeyAction.toggleEnglish:
        setState(() {
          _english = !_english;
          _status = _english ? 'English enabled.' : 'English disabled.';
        });
        break;
      case KeyboardPreviewKeyAction.suggestion:
        _insertSuggestion(key.output ?? key.label);
        break;
      case KeyboardPreviewKeyAction.snippet:
        _insertText(key.output ?? key.label, status: 'Snippet inserted.');
        break;
      case KeyboardPreviewKeyAction.text:
        var value = key.output ?? key.label;
        if (_shiftEnabled && value.isNotEmpty) {
          value = value.length == 1
              ? value.toUpperCase()
              : '${value[0].toUpperCase()}${value.substring(1)}';
        }
        _insertText(value);
        if (_shiftEnabled) {
          setState(() => _shiftEnabled = false);
        }
        break;
      case KeyboardPreviewKeyAction.unsupported:
        _setStatus(
          'Action non simulated: ${key.unsupportedReason ?? key.label}.',
        );
        break;
    }
  }

  void _onKeyLongPressed(KeyboardPreviewKey key) {
    if (!key.enabled) {
      return;
    }
    if (key.action == KeyboardPreviewKeyAction.panelSwitch &&
        key.panelTarget == KeyboardPreviewPanel.clipboard) {
      _setPanel(KeyboardPreviewPanel.clipboardFull);
      return;
    }
    final corner = key.topLeftShortcut;
    if (corner != null) {
      _simulateCorner(corner);
      return;
    }
    _onKeyPressed(key);
  }

  void _simulateCorner(AndroidKeyboardCornerShortcut shortcut) {
    final expression = shortcut.expression.toLowerCase();
    if (expression.contains('action:') ||
        expression.startsWith('keyevent:') ||
        expression.startsWith('modifier:') ||
        expression.contains(',keyevent:') ||
        expression.contains(',action:') ||
        expression.contains(',modifier:')) {
      _setStatus('Native-only gesture action: ${shortcut.displayLabel}.');
      return;
    }
    final text = _textFromCornerExpression(shortcut.expression);
    _insertText(text, status: 'Gesture shortcut inserted "$text".');
  }

  String _textFromCornerExpression(String expression) {
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
    final preview = KeyboardPreviewSnapshot(
      profile: _profile,
      fieldContext: _fieldContext,
      panel: _panel,
      mode: _effectiveMode,
      privateMode: _privateMode,
      corners: _corners,
      debug: _debug,
      vibration: _vibration,
      soundMode: _soundMode,
      suggestionsEnabled: _suggestions,
      specialCorners: _specialCorners,
      frenchEnabled: _french,
      englishEnabled: _english,
      shiftEnabled: _shiftEnabled,
      mediaNowPlaying: _mediaNowPlaying,
      cornerConfig: _cornerConfig,
    );

    return ListView(
      padding: AppInsets.screen,
      children: [
        const AppSectionCard(
          title: 'Keyboard preview',
          subtitle:
              'Browser review surface for CommandGlows keyboard layouts. Native IME behavior still needs Android device validation.',
          child: SizedBox.shrink(),
        ),
        AppGaps.x4,
        _PreviewControls(
          value: _PreviewControlsValue(
            profile: _profile,
            fieldContext: _fieldContext,
            panel: _panel,
            mode: _mode,
            privateMode: _privateMode,
            corners: _corners,
            debug: _debug,
            cornerConfig: _cornerConfig,
          ),
          actions: _PreviewControlsActions(
            onProfileChanged: (value) => setState(() => _profile = value),
            onFieldContextChanged: _setFieldContext,
            onPanelChanged: _setPanel,
            onModeChanged: _setMode,
            onPrivateModeChanged: (value) => setState(() {
              _privateMode = value;
              _status = value
                  ? 'Private mode on: clipboard/snippets disabled in preview.'
                  : 'Private mode off.';
            }),
            onCornersChanged: (value) => setState(() {
              _corners = value;
              _status = value ? 'Gestures enabled.' : 'Gestures disabled.';
            }),
            onDebugChanged: (value) => setState(() {
              _debug = value;
              _status = value ? 'Debug overlay on.' : 'Debug overlay off.';
            }),
            onCornerPresetChanged: (value) => setState(() {
              _cornerConfig = _cornerConfig.copyWith(presetId: value);
              _status = 'Preview gesture preset: $value.';
            }),
          ),
        ),
        AppGaps.x4,
        _KeyboardFrame(
          snapshot: preview,
          buffer: _buffer,
          cursor: _cursor,
          status: _status,
          onKeyPressed: _onKeyPressed,
          onKeyLongPressed: _onKeyLongPressed,
          onClear: _clearBuffer,
          onReset: _resetSandbox,
        ),
      ],
    );
  }
}

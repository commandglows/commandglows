import 'package:flutter/services.dart';

class ShortcutChord {
  const ShortcutChord({
    required this.keyId,
    required this.keyLabel,
    this.control = false,
    this.alt = false,
    this.shift = false,
    this.meta = false,
  });

  final int keyId;
  final String keyLabel;
  final bool control;
  final bool alt;
  final bool shift;
  final bool meta;

  String get label => [
    if (control) 'Ctrl',
    if (alt) 'Alt',
    if (shift) 'Maj',
    if (meta) 'Win',
    keyLabel,
  ].join(' + ');

  bool matches(ShortcutChord other) =>
      keyId == other.keyId &&
      control == other.control &&
      alt == other.alt &&
      shift == other.shift &&
      meta == other.meta;

  /// Some combinations are consumed by Windows or by this app before Flutter
  /// can observe them. Practice for those uses explicit self-assessment.
  bool get requiresSelfAssessment =>
      keyId == 0 ||
      meta ||
      (alt && keyId == LogicalKeyboardKey.tab.keyId) ||
      (control && alt && keyId == LogicalKeyboardKey.delete.keyId) ||
      (control &&
          alt &&
          {
            LogicalKeyboardKey.keyK.keyId,
            LogicalKeyboardKey.keyG.keyId,
            LogicalKeyboardKey.space.keyId,
          }.contains(keyId));

  static ShortcutChord? tryParse(String input) {
    final parts = input.split('+').map((part) => part.trim()).toList();
    if (parts.isEmpty || parts.any((part) => part.isEmpty)) return null;
    var control = false;
    var alt = false;
    var shift = false;
    var meta = false;
    for (final part in parts.take(parts.length - 1)) {
      switch (part.toLowerCase()) {
        case 'ctrl':
        case 'contrôle':
        case 'control':
          if (control) return null;
          control = true;
        case 'alt':
          if (alt) return null;
          alt = true;
        case 'maj':
        case 'shift':
          if (shift) return null;
          shift = true;
        case 'win':
        case 'meta':
          if (meta) return null;
          meta = true;
        default:
          return null;
      }
    }
    final token = parts.last.toLowerCase();
    final LogicalKeyboardKey? key;
    if (RegExp(r'^[a-z0-9]$').hasMatch(token)) {
      key = LogicalKeyboardKey.findKeyByKeyId(token.codeUnitAt(0));
    } else if (RegExp(r'^f([1-9]|1[0-9]|2[0-4])$').hasMatch(token)) {
      final functionKeys = [
        LogicalKeyboardKey.f1,
        LogicalKeyboardKey.f2,
        LogicalKeyboardKey.f3,
        LogicalKeyboardKey.f4,
        LogicalKeyboardKey.f5,
        LogicalKeyboardKey.f6,
        LogicalKeyboardKey.f7,
        LogicalKeyboardKey.f8,
        LogicalKeyboardKey.f9,
        LogicalKeyboardKey.f10,
        LogicalKeyboardKey.f11,
        LogicalKeyboardKey.f12,
        LogicalKeyboardKey.f13,
        LogicalKeyboardKey.f14,
        LogicalKeyboardKey.f15,
        LogicalKeyboardKey.f16,
        LogicalKeyboardKey.f17,
        LogicalKeyboardKey.f18,
        LogicalKeyboardKey.f19,
        LogicalKeyboardKey.f20,
        LogicalKeyboardKey.f21,
        LogicalKeyboardKey.f22,
        LogicalKeyboardKey.f23,
        LogicalKeyboardKey.f24,
      ];
      key = functionKeys[int.parse(token.substring(1)) - 1];
    } else {
      key = switch (token) {
        'tab' => LogicalKeyboardKey.tab,
        'espace' || 'space' => LogicalKeyboardKey.space,
        'échap' || 'echap' || 'esc' => LogicalKeyboardKey.escape,
        'entrée' || 'entree' || 'enter' => LogicalKeyboardKey.enter,
        'suppr' || 'delete' || 'del' => LogicalKeyboardKey.delete,
        'retour' ||
        'retour arrière' ||
        'backspace' => LogicalKeyboardKey.backspace,
        'page précédente' || 'page up' || 'pgup' => LogicalKeyboardKey.pageUp,
        'page suivante' || 'page down' || 'pgdn' => LogicalKeyboardKey.pageDown,
        '←' || 'gauche' => LogicalKeyboardKey.arrowLeft,
        '→' || 'droite' => LogicalKeyboardKey.arrowRight,
        '↑' || 'haut' => LogicalKeyboardKey.arrowUp,
        '↓' || 'bas' => LogicalKeyboardKey.arrowDown,
        _ => null,
      };
    }
    if (key == null) return null;
    return ShortcutChord(
      keyId: key.keyId,
      keyLabel: _displayKey(key),
      control: control,
      alt: alt,
      shift: shift,
      meta: meta,
    );
  }

  /// Keep an unfamiliar physical key visible without claiming that a logical
  /// key event can be compared reliably during practice.
  static ShortcutChord fromDisplayLabel(String label) =>
      tryParse(label) ?? ShortcutChord(keyId: 0, keyLabel: label.trim());

  Map<String, Object> toJson() => {
    'keyId': keyId,
    'keyLabel': keyLabel,
    'control': control,
    'alt': alt,
    'shift': shift,
    'meta': meta,
  };

  factory ShortcutChord.fromJson(Map<String, dynamic> json) => ShortcutChord(
    keyId: json['keyId'] as int,
    keyLabel: json['keyLabel'] as String,
    control: json['control'] as bool? ?? false,
    alt: json['alt'] as bool? ?? false,
    shift: json['shift'] as bool? ?? false,
    meta: json['meta'] as bool? ?? false,
  );

  static ShortcutChord? fromKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent) return null;
    final key = event.logicalKey;
    if ({
      LogicalKeyboardKey.controlLeft,
      LogicalKeyboardKey.controlRight,
      LogicalKeyboardKey.altLeft,
      LogicalKeyboardKey.altRight,
      LogicalKeyboardKey.shiftLeft,
      LogicalKeyboardKey.shiftRight,
      LogicalKeyboardKey.metaLeft,
      LogicalKeyboardKey.metaRight,
    }.contains(key)) {
      return null;
    }
    final keyboard = HardwareKeyboard.instance;
    return ShortcutChord(
      keyId: key.keyId,
      keyLabel: _displayKey(key),
      control: keyboard.isControlPressed,
      alt: keyboard.isAltPressed,
      shift: keyboard.isShiftPressed,
      meta: keyboard.isMetaPressed,
    );
  }

  static String _displayKey(LogicalKeyboardKey key) {
    if (key == LogicalKeyboardKey.space) return 'Espace';
    if (key == LogicalKeyboardKey.escape) return 'Échap';
    if (key == LogicalKeyboardKey.enter) return 'Entrée';
    if (key == LogicalKeyboardKey.tab) return 'Tab';
    if (key == LogicalKeyboardKey.backspace) return 'Retour arrière';
    if (key == LogicalKeyboardKey.pageUp) return 'Page précédente';
    if (key == LogicalKeyboardKey.pageDown) return 'Page suivante';
    if (key == LogicalKeyboardKey.arrowLeft) return '←';
    if (key == LogicalKeyboardKey.arrowRight) return '→';
    if (key == LogicalKeyboardKey.arrowUp) return '↑';
    if (key == LogicalKeyboardKey.arrowDown) return '↓';
    final label = key.keyLabel.trim();
    return label.isEmpty ? key.debugName ?? 'Touche' : label.toUpperCase();
  }
}

class ShortcutEntry {
  const ShortcutEntry({
    required this.id,
    required this.appName,
    required this.description,
    required this.chord,
    required this.createdAt,
    this.sourceId,
    this.selfAssessmentOnly = false,
  });

  final String id;
  final String appName;
  final String description;
  final ShortcutChord chord;
  final DateTime createdAt;
  final String? sourceId;
  final bool selfAssessmentOnly;

  bool get requiresSelfAssessment =>
      selfAssessmentOnly || chord.requiresSelfAssessment;

  Map<String, Object> toJson() => {
    'id': id,
    'appName': appName,
    'description': description,
    'chord': chord.toJson(),
    'createdAt': createdAt.toIso8601String(),
    'sourceId': ?sourceId,
    if (selfAssessmentOnly) 'selfAssessmentOnly': true,
  };

  factory ShortcutEntry.fromJson(Map<String, dynamic> json) => ShortcutEntry(
    id: json['id'] as String,
    appName: json['appName'] as String,
    description: json['description'] as String,
    chord: ShortcutChord.fromJson(
      Map<String, dynamic>.from(json['chord'] as Map),
    ),
    createdAt: DateTime.parse(json['createdAt'] as String),
    sourceId: json['sourceId'] as String?,
    selfAssessmentOnly: json['selfAssessmentOnly'] as bool? ?? false,
  );
}

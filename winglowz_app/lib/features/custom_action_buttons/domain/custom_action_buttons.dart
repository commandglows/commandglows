import 'package:flutter/material.dart';

enum CustomActionKind {
  insertText,
  keySequence,
  keyboardExpression,
  clipboardCommand,
  mediaCommand,
  macro,
}

bool _knownAndroidImeCommand(CustomActionKind kind, String value) {
  return switch (kind) {
    CustomActionKind.clipboardCommand => switch (value) {
      'copy' || 'cut' || 'paste' => true,
      _ => false,
    },
    CustomActionKind.mediaCommand => switch (value) {
      'playPause' ||
      'play' ||
      'pause' ||
      'nextTrack' ||
      'previousTrack' => true,
      _ => false,
    },
    _ => false,
  };
}

extension CustomActionKindPresentation on CustomActionKind {
  IconData get iconData {
    return switch (this) {
      CustomActionKind.insertText => Icons.text_snippet_outlined,
      CustomActionKind.keySequence => Icons.keyboard_command_key,
      CustomActionKind.keyboardExpression => Icons.auto_fix_high_outlined,
      CustomActionKind.clipboardCommand => Icons.content_paste_outlined,
      CustomActionKind.mediaCommand => Icons.play_circle_outline,
      CustomActionKind.macro => Icons.account_tree_outlined,
    };
  }

  String get label {
    return switch (this) {
      CustomActionKind.insertText => 'Texte',
      CustomActionKind.keySequence => 'Séquence clavier',
      CustomActionKind.keyboardExpression => 'Action CommandGlows',
      CustomActionKind.clipboardCommand => 'Presse-papiers',
      CustomActionKind.mediaCommand => 'Média',
      CustomActionKind.macro => 'Macro',
    };
  }

  bool get requiresFreeText {
    return switch (this) {
      CustomActionKind.insertText ||
      CustomActionKind.keySequence ||
      CustomActionKind.keyboardExpression ||
      CustomActionKind.macro => true,
      CustomActionKind.clipboardCommand ||
      CustomActionKind.mediaCommand => false,
    };
  }

  String get defaultValue {
    return switch (this) {
      CustomActionKind.clipboardCommand => CustomClipboardCommand.paste.name,
      CustomActionKind.mediaCommand => CustomMediaCommand.playPause.name,
      _ => '',
    };
  }
}

extension CustomActionButtonActionRuntimeSupport on CustomActionButtonAction {
  bool get supportsKeyboardCornerExecution {
    return keyboardCornerExpression != null;
  }

  bool get supportsImeExecution {
    return switch (kind) {
      CustomActionKind.insertText => true,
      CustomActionKind.keyboardExpression => true,
      CustomActionKind.clipboardCommand => true,
      CustomActionKind.mediaCommand => true,
      CustomActionKind.keySequence => false,
      CustomActionKind.macro => false,
    };
  }

  bool get hasValidImePayload {
    return switch (kind) {
      CustomActionKind.insertText => trimmedValue.isNotEmpty,
      CustomActionKind.keyboardExpression => trimmedValue.isNotEmpty,
      CustomActionKind.clipboardCommand || CustomActionKind.mediaCommand =>
        _knownAndroidImeCommand(kind, trimmedValue),
      CustomActionKind.keySequence => false,
      CustomActionKind.macro => false,
    };
  }

  bool get isImeCompatible => supportsImeExecution && hasValidImePayload;

  String get imeCompatibilityLabel {
    if (isImeCompatible) {
      return 'IME: compatible';
    }
    return 'IME: incompatible';
  }

  String get imeCompatibilityReason {
    if (isImeCompatible) {
      return 'Action prête pour l’IME Android.';
    }
    return switch (kind) {
      CustomActionKind.keySequence =>
        'Séquences clavier: non exécutables dans l’IME Android.',
      CustomActionKind.macro =>
        'Macro: non prise en charge dans l’IME Android.',
      CustomActionKind.insertText when trimmedValue.isEmpty =>
        'Texte: valeur vide, action ignorée.',
      CustomActionKind.keyboardExpression when trimmedValue.isEmpty =>
        'Expression: valeur vide, action ignorée.',
      CustomActionKind.clipboardCommand when trimmedValue.isEmpty =>
        'Presse-papiers: commande vide.',
      CustomActionKind.mediaCommand when trimmedValue.isEmpty =>
        'Média: commande vide.',
      CustomActionKind.clipboardCommand || CustomActionKind.mediaCommand =>
        'Commande non reconnue par l’IME Android.',
      _ => 'Action non supportée dans l’IME Android.',
    };
  }

  String get imeCompatibilitySummary {
    return '$imeCompatibilityLabel${isImeCompatible ? '' : ': $imeCompatibilityReason'}';
  }

  String get keyboardCornerUnsupportedReason {
    return switch (kind) {
      CustomActionKind.keySequence =>
        'Les séquences clavier ne sont pas disponibles pour les gestes Android.',
      CustomActionKind.mediaCommand =>
        'Les commandes média ne sont pas disponibles pour les gestes Android.',
      CustomActionKind.macro => 'Les macros ne sont pas encore supportées ici.',
      _ => 'Cette action ne peut pas être ajoutée au geste configuré.',
    };
  }

  String? get keyboardCornerExpression {
    final normalizedValue = trimmedValue;
    return switch (kind) {
      CustomActionKind.insertText =>
        normalizedValue.isEmpty ? null : _quotedTextExpression(normalizedValue),
      CustomActionKind.keyboardExpression =>
        normalizedValue.isEmpty ? null : normalizedValue,
      CustomActionKind.clipboardCommand => _clipboardCommandToExpression(
        normalizedValue,
      ),
      CustomActionKind.keySequence ||
      CustomActionKind.mediaCommand ||
      CustomActionKind.macro => null,
    };
  }

  String _clipboardCommandToExpression(String rawCommand) {
    return switch (CustomClipboardCommandPresentation.fromName(rawCommand)) {
      CustomClipboardCommand.copy => 'action:CopySelection',
      CustomClipboardCommand.cut => 'action:CutSelection',
      CustomClipboardCommand.paste => 'action:PasteClipboard',
    };
  }

  String _quotedTextExpression(String value) {
    final escaped = value.replaceAll('\\', '\\\\').replaceAll("'", r"\'");
    return "'$escaped'";
  }
}

enum CustomActionButtonImeActionType {
  insertText,
  keyboardExpression,
  clipboardCommand,
  mediaCommand,
}

class CustomActionButtonImeAction {
  const CustomActionButtonImeAction({
    required this.id,
    required this.title,
    required this.icon,
    required this.type,
    required this.value,
    required this.orderIndex,
    required this.sensitive,
  });

  final String id;
  final String title;
  final CustomActionButtonIcon icon;
  final CustomActionButtonImeActionType type;
  final String value;
  final int orderIndex;
  final bool sensitive;

  Map<String, Object?> toMap() {
    return {
      'id': id,
      'title': title,
      'icon': icon.name,
      'type': type.name,
      'value': value,
      'orderIndex': orderIndex,
      'sensitive': sensitive,
    };
  }
}

class CustomActionButtonImeConfig {
  const CustomActionButtonImeConfig({
    required this.enabled,
    required this.actions,
  });

  final bool enabled;
  final List<CustomActionButtonImeAction> actions;

  Map<String, Object?> toMap() {
    return {
      'enabled': enabled,
      'actions': actions
          .map((action) => action.toMap())
          .toList(growable: false),
    };
  }
}

extension CustomActionButtonImeSupport on CustomActionButtonRecord {
  static const int maxTitleLength = 48;
  static const int maxValueLength = 2048;

  bool get supportsAndroidImeExecution => androidImeActionOrNull != null;

  String get androidImeUnsupportedReason {
    if (title.trim().isEmpty) {
      return 'Le bouton doit avoir un nom pour apparaître dans le clavier.';
    }
    if (action.trimmedValue.length > maxValueLength) {
      return 'Le contenu est trop long pour la barre IME Android.';
    }
    return switch (action.kind) {
      CustomActionKind.keySequence =>
        'Les séquences clavier desktop comme Ctrl+W, N restent hors Android.',
      CustomActionKind.macro =>
        'Les macros ne sont pas encore exécutées dans le clavier Android.',
      CustomActionKind.insertText || CustomActionKind.keyboardExpression =>
        action.trimmedValue.isEmpty
            ? 'Cette action doit avoir une valeur pour le clavier.'
            : 'Compatible avec le clavier Android.',
      CustomActionKind.clipboardCommand || CustomActionKind.mediaCommand =>
        _knownAndroidImeCommand(action.kind, action.trimmedValue)
            ? 'Compatible avec le clavier Android quand le contexte l’autorise.'
            : 'Cette commande n’est pas reconnue par le clavier Android.',
    };
  }

  CustomActionButtonImeAction? get androidImeActionOrNull {
    final normalizedTitle = title.trim();
    final normalizedValue = action.trimmedValue;
    if (normalizedTitle.isEmpty || normalizedValue.length > maxValueLength) {
      return null;
    }
    final type = switch (action.kind) {
      CustomActionKind.insertText =>
        normalizedValue.isEmpty
            ? null
            : CustomActionButtonImeActionType.insertText,
      CustomActionKind.keyboardExpression =>
        normalizedValue.isEmpty
            ? null
            : CustomActionButtonImeActionType.keyboardExpression,
      CustomActionKind.clipboardCommand =>
        _knownAndroidImeCommand(action.kind, normalizedValue)
            ? CustomActionButtonImeActionType.clipboardCommand
            : null,
      CustomActionKind.mediaCommand =>
        _knownAndroidImeCommand(action.kind, normalizedValue)
            ? CustomActionButtonImeActionType.mediaCommand
            : null,
      CustomActionKind.keySequence || CustomActionKind.macro => null,
    };
    if (type == null) {
      return null;
    }
    return CustomActionButtonImeAction(
      id: id,
      title: normalizedTitle.length <= maxTitleLength
          ? normalizedTitle
          : normalizedTitle.substring(0, maxTitleLength),
      icon: icon,
      type: type,
      value: normalizedValue,
      orderIndex: orderIndex,
      sensitive: _sensitiveInIme(type),
    );
  }

  bool _sensitiveInIme(CustomActionButtonImeActionType type) {
    return switch (type) {
      CustomActionButtonImeActionType.insertText => true,
      CustomActionButtonImeActionType.keyboardExpression => true,
      CustomActionButtonImeActionType.clipboardCommand => true,
      CustomActionButtonImeActionType.mediaCommand => false,
    };
  }
}

extension CustomActionButtonImeListSupport on List<CustomActionButtonRecord> {
  List<CustomActionButtonImeAction> toAndroidImeActions() {
    final actions = <CustomActionButtonImeAction>[];
    for (final button in this) {
      final action = button.androidImeActionOrNull;
      if (action != null) {
        actions.add(action);
      }
    }
    actions.sort((a, b) {
      final order = a.orderIndex.compareTo(b.orderIndex);
      if (order != 0) {
        return order;
      }
      return a.title.compareTo(b.title);
    });
    return actions;
  }
}

enum CustomClipboardCommand { copy, cut, paste }

extension CustomClipboardCommandPresentation on CustomClipboardCommand {
  IconData get iconData {
    return switch (this) {
      CustomClipboardCommand.copy => Icons.content_copy_outlined,
      CustomClipboardCommand.cut => Icons.content_cut_outlined,
      CustomClipboardCommand.paste => Icons.content_paste_outlined,
    };
  }

  String get label {
    return switch (this) {
      CustomClipboardCommand.copy => 'Copier',
      CustomClipboardCommand.cut => 'Couper',
      CustomClipboardCommand.paste => 'Coller',
    };
  }

  String get key {
    return switch (this) {
      CustomClipboardCommand.copy => 'C',
      CustomClipboardCommand.cut => 'X',
      CustomClipboardCommand.paste => 'V',
    };
  }

  static CustomClipboardCommand fromName(String raw) {
    return CustomClipboardCommand.values.firstWhere(
      (item) => item.name == raw.trim(),
      orElse: () => CustomClipboardCommand.paste,
    );
  }
}

enum CustomMediaCommand { playPause, play, pause, nextTrack, previousTrack }

extension CustomMediaCommandPresentation on CustomMediaCommand {
  IconData get iconData {
    return switch (this) {
      CustomMediaCommand.playPause => Icons.play_circle_outline,
      CustomMediaCommand.play => Icons.play_arrow_outlined,
      CustomMediaCommand.pause => Icons.pause_outlined,
      CustomMediaCommand.nextTrack => Icons.skip_next_outlined,
      CustomMediaCommand.previousTrack => Icons.skip_previous_outlined,
    };
  }

  String get label {
    return switch (this) {
      CustomMediaCommand.playPause => 'Play/Pause',
      CustomMediaCommand.play => 'Play',
      CustomMediaCommand.pause => 'Pause',
      CustomMediaCommand.nextTrack => 'Suivant',
      CustomMediaCommand.previousTrack => 'Précédent',
    };
  }

  static CustomMediaCommand fromName(String raw) {
    return CustomMediaCommand.values.firstWhere(
      (item) => item.name == raw.trim(),
      orElse: () => CustomMediaCommand.playPause,
    );
  }
}

enum CustomActionButtonIcon {
  spark,
  window,
  bolt,
  terminal,
  clipboard,
  cursor,
  wand,
  layers,
}

extension CustomActionButtonIconPresentation on CustomActionButtonIcon {
  IconData get iconData {
    return switch (this) {
      CustomActionButtonIcon.spark => Icons.auto_awesome_outlined,
      CustomActionButtonIcon.window => Icons.web_asset_outlined,
      CustomActionButtonIcon.bolt => Icons.bolt_outlined,
      CustomActionButtonIcon.terminal => Icons.terminal_outlined,
      CustomActionButtonIcon.clipboard => Icons.content_paste_outlined,
      CustomActionButtonIcon.cursor => Icons.ads_click_outlined,
      CustomActionButtonIcon.wand => Icons.auto_fix_high_outlined,
      CustomActionButtonIcon.layers => Icons.layers_outlined,
    };
  }

  String get label {
    return switch (this) {
      CustomActionButtonIcon.spark => 'Étincelle',
      CustomActionButtonIcon.window => 'Fenêtre',
      CustomActionButtonIcon.bolt => 'Éclair',
      CustomActionButtonIcon.terminal => 'Commande',
      CustomActionButtonIcon.clipboard => 'Papiers',
      CustomActionButtonIcon.cursor => 'Curseur',
      CustomActionButtonIcon.wand => 'Action',
      CustomActionButtonIcon.layers => 'Pile',
    };
  }
}

class CustomActionButtonAction {
  const CustomActionButtonAction({required this.kind, required this.value});

  final CustomActionKind kind;
  final String value;

  String get trimmedValue => value.trim();

  Map<String, Object?> toMap() {
    return {'kind': kind.name, 'value': trimmedValue};
  }

  factory CustomActionButtonAction.fromMap(Map<Object?, Object?> map) {
    final rawKind = (map['kind'] as String?) ?? (map['type'] as String?) ?? '';
    return CustomActionButtonAction(
      kind: _kindFromWireName(rawKind),
      value: map['value'] as String? ?? '',
    );
  }

  static CustomActionKind _kindFromWireName(String raw) {
    return switch (raw) {
      'textSnippet' => CustomActionKind.insertText,
      'desktopKeySequence' => CustomActionKind.keySequence,
      _ => CustomActionKind.values.firstWhere(
        (item) => item.name == raw,
        orElse: () => CustomActionKind.insertText,
      ),
    };
  }
}

class CustomActionButtonRecord {
  const CustomActionButtonRecord({
    required this.id,
    required this.title,
    required this.icon,
    required this.action,
    required this.createdAt,
    this.rowIndex = 0,
    this.orderIndex = 0,
  });

  final String id;
  final String title;
  final CustomActionButtonIcon icon;
  final CustomActionButtonAction action;
  final DateTime createdAt;
  final int rowIndex;
  final int orderIndex;
}

class CustomActionBarLayout {
  const CustomActionBarLayout({required this.rows});

  final List<CustomActionBarRow> rows;

  factory CustomActionBarLayout.fromButtons(
    List<CustomActionButtonRecord> buttons,
  ) {
    final grouped = <int, List<CustomActionButtonRecord>>{};
    for (final button in buttons) {
      grouped.putIfAbsent(button.rowIndex, () => []).add(button);
    }
    final rowIndexes = grouped.keys.toList()..sort();
    return CustomActionBarLayout(
      rows: rowIndexes
          .map((rowIndex) {
            final rowButtons = grouped[rowIndex]!
              ..sort((a, b) {
                final order = a.orderIndex.compareTo(b.orderIndex);
                if (order != 0) {
                  return order;
                }
                return a.createdAt.compareTo(b.createdAt);
              });
            return CustomActionBarRow(
              index: rowIndex,
              slots: rowButtons
                  .map((button) => CustomActionBarSlot(button: button))
                  .toList(growable: false),
            );
          })
          .toList(growable: false),
    );
  }
}

class CustomActionBarRow {
  const CustomActionBarRow({required this.index, required this.slots});

  final int index;
  final List<CustomActionBarSlot> slots;
}

class CustomActionBarSlot {
  const CustomActionBarSlot({required this.button});

  final CustomActionButtonRecord button;
}

enum DesktopKeyModifier { ctrl, alt, shift, meta }

class DesktopKeyStroke {
  const DesktopKeyStroke({required this.key, required this.modifiers});

  final String key;
  final List<DesktopKeyModifier> modifiers;

  Map<String, Object?> toMap() {
    return {
      'key': key,
      'modifiers': modifiers.map((item) => item.name).toList(growable: false),
    };
  }
}

class DesktopKeySequence {
  const DesktopKeySequence._(this.steps);

  final List<DesktopKeyStroke> steps;

  static const _namedKeys = <String, String>{
    'tab': 'Tab',
    'enter': 'Enter',
    'return': 'Enter',
    'space': 'Space',
    'esc': 'Escape',
    'escape': 'Escape',
    'left': 'Left',
    'right': 'Right',
    'up': 'Up',
    'down': 'Down',
    'backspace': 'Backspace',
    'delete': 'Delete',
  };

  factory DesktopKeySequence.parse(String raw) {
    final normalized = raw.trim();
    if (normalized.isEmpty) {
      throw const FormatException('La séquence clavier est vide.');
    }
    final steps = normalized
        .split(',')
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .map(_parseStep)
        .toList(growable: false);
    if (steps.isEmpty) {
      throw const FormatException('Aucune étape clavier valide.');
    }
    return DesktopKeySequence._(steps);
  }

  static DesktopKeyStroke _parseStep(String rawStep) {
    final tokens = rawStep
        .split('+')
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList(growable: false);
    if (tokens.isEmpty) {
      throw FormatException('Étape clavier vide: "$rawStep".');
    }
    final modifiers = <DesktopKeyModifier>[];
    String? key;
    for (final token in tokens) {
      final lower = token.toLowerCase();
      final modifier = switch (lower) {
        'ctrl' || 'control' => DesktopKeyModifier.ctrl,
        'alt' || 'option' => DesktopKeyModifier.alt,
        'shift' => DesktopKeyModifier.shift,
        'meta' || 'cmd' || 'command' || 'win' => DesktopKeyModifier.meta,
        _ => null,
      };
      if (modifier != null) {
        if (!modifiers.contains(modifier)) {
          modifiers.add(modifier);
        }
        continue;
      }
      if (key != null) {
        throw FormatException(
          'Une étape ne peut contenir qu’une seule touche principale: "$rawStep".',
        );
      }
      key = _normalizeKeyToken(token);
    }
    if (key == null) {
      throw FormatException(
        'Aucune touche principale détectée dans "$rawStep".',
      );
    }
    return DesktopKeyStroke(key: key, modifiers: modifiers);
  }

  static String _normalizeKeyToken(String token) {
    final lower = token.toLowerCase();
    final named = _namedKeys[lower];
    if (named != null) {
      return named;
    }
    if (token.length == 1) {
      final upper = token.toUpperCase();
      final code = upper.codeUnitAt(0);
      final isLetter = code >= 65 && code <= 90;
      final isDigit = code >= 48 && code <= 57;
      if (isLetter || isDigit) {
        return upper;
      }
    }
    throw FormatException('Touche non supportée: "$token".');
  }
}

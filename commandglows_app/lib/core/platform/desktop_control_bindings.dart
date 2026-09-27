import 'dart:convert';

class DesktopPhysicalKey {
  const DesktopPhysicalKey(
    this.scanCode, [
    this.extended = false,
    this.label,
    this.modifiers = 0,
  ]);

  final int scanCode;
  final bool extended;
  final String? label;

  /// Ctrl=2, Alt=1, Shift=4, Windows=8 (matches activation modifiers).
  final int modifiers;

  Map<String, Object> toWire({bool includeLabel = false}) => {
    'scanCode': scanCode,
    'extended': extended,
    'modifiers': modifiers,
    if (includeLabel && label != null) 'label': label!,
  };

  factory DesktopPhysicalKey.fromWire(Object? value) {
    final map = Map<Object?, Object?>.from(value! as Map);
    return DesktopPhysicalKey(
      map['scanCode'] as int,
      map['extended'] as bool? ?? false,
      (map['label'] as String?)?.trim(),
      (map['modifiers'] as int?) ?? 0,
    );
  }

  String get displayLabel {
    final keyLabel =
        label ??
        switch ((scanCode, extended)) {
          (0x39, _) => 'Espace',
          (0x01, _) => 'Échap',
          (0x0E, _) => 'Retour arrière',
          (0x0F, _) => 'Tab',
          (0x49, true) => 'Page précédente',
          (0x51, true) => 'Page suivante',
          (0x48, true) => '↑',
          (0x50, true) => '↓',
          (0x4B, true) => '←',
          (0x4D, true) => '→',
          (final code, _) when code >= 0x3B && code <= 0x44 =>
            'F${code - 0x3A}',
          (final code, _) =>
            'Touche 0x${code.toRadixString(16).padLeft(2, '0')}',
        };
    return '${modifiers & 2 != 0 ? 'Ctrl+' : ''}${modifiers & 1 != 0 ? 'Alt+' : ''}${modifiers & 4 != 0 ? 'Maj+' : ''}${modifiers & 8 != 0 ? 'Win+' : ''}$keyLabel';
  }

  @override
  bool operator ==(Object other) =>
      other is DesktopPhysicalKey &&
      other.scanCode == scanCode &&
      other.extended == extended &&
      other.modifiers == modifiers;

  @override
  int get hashCode => Object.hash(scanCode, extended, modifiers);
}

class DesktopControlBindings {
  DesktopControlBindings({
    required this.activationVirtualKey,
    required this.activationModifiers,
    required Map<String, List<DesktopPhysicalKey>> actions,
    this.recoveredInvalidData = false,
    this.migratedFromLegacy = false,
  }) : actions = {
         for (final entry in actions.entries)
           entry.key: List.unmodifiable(entry.value),
       };

  static const version = 2;
  static const actionIds = <String>[
    'leftClick',
    'rightClick',
    'middleClick',
    'dragStart',
    'dragRelease',
    'wheelUp',
    'wheelDown',
    'back',
    'reset',
    'coordinateView',
    'toggleScope',
    'previousMonitor',
    'nextMonitor',
    'nudgeLeft',
    'nudgeRight',
    'nudgeUp',
    'nudgeDown',
    'close',
  ];
  static const actionLabels = <String, String>{
    'leftClick': 'Clic gauche',
    'rightClick': 'Clic droit',
    'middleClick': 'Clic central',
    'dragStart': 'Commencer le glisser',
    'dragRelease': 'Relâcher le glisser',
    'wheelUp': 'Défilement haut',
    'wheelDown': 'Défilement bas',
    'back': 'Revenir d’une case',
    'reset': 'Réinitialiser la grille',
    'coordinateView': 'Grille de coordonnées',
    'toggleScope': 'Basculer fenêtre / écran',
    'previousMonitor': 'Écran précédent',
    'nextMonitor': 'Écran suivant',
    'nudgeLeft': 'Déplacer à gauche',
    'nudgeRight': 'Déplacer à droite',
    'nudgeUp': 'Déplacer vers le haut',
    'nudgeDown': 'Déplacer vers le bas',
    'close': 'Fermer la grille',
  };

  final int activationVirtualKey;
  final int activationModifiers;
  final Map<String, List<DesktopPhysicalKey>> actions;
  final bool recoveredInvalidData;
  final bool migratedFromLegacy;

  factory DesktopControlBindings.defaults() => DesktopControlBindings(
    activationVirtualKey: 0x47,
    activationModifiers: 0x0003,
    actions: {
      'leftClick': [
        const DesktopPhysicalKey(0x39),
        const DesktopPhysicalKey(0x3B),
      ],
      'rightClick': [const DesktopPhysicalKey(0x3C)],
      'middleClick': [const DesktopPhysicalKey(0x3D)],
      'dragStart': [const DesktopPhysicalKey(0x3E)],
      'dragRelease': [const DesktopPhysicalKey(0x3F)],
      'wheelUp': [const DesktopPhysicalKey(0x40)],
      'wheelDown': [const DesktopPhysicalKey(0x41)],
      'back': [const DesktopPhysicalKey(0x0E)],
      'reset': [const DesktopPhysicalKey(0x43)],
      'coordinateView': [const DesktopPhysicalKey(0x0F)],
      'toggleScope': [const DesktopPhysicalKey(0x42)],
      'previousMonitor': [const DesktopPhysicalKey(0x49, true)],
      'nextMonitor': [const DesktopPhysicalKey(0x51, true)],
      'nudgeLeft': [const DesktopPhysicalKey(0x4B, true)],
      'nudgeRight': [const DesktopPhysicalKey(0x4D, true)],
      'nudgeUp': [const DesktopPhysicalKey(0x48, true)],
      'nudgeDown': [const DesktopPhysicalKey(0x50, true)],
      'close': [const DesktopPhysicalKey(0x01)],
    },
  );

  DesktopControlBindings copyWith({
    int? activationVirtualKey,
    int? activationModifiers,
    Map<String, List<DesktopPhysicalKey>>? actions,
  }) => DesktopControlBindings(
    activationVirtualKey: activationVirtualKey ?? this.activationVirtualKey,
    activationModifiers: activationModifiers ?? this.activationModifiers,
    actions: actions ?? this.actions,
  );

  Map<String, Object> toWire({bool includeLabels = false}) => {
    'version': version,
    'activation': {
      'virtualKey': activationVirtualKey,
      'modifiers': activationModifiers,
    },
    'actions': {
      for (final id in actionIds)
        id: (actions[id] ?? const [])
            .map((key) => key.toWire(includeLabel: includeLabels))
            .toList(),
    },
  };

  factory DesktopControlBindings.fromWire(Map<Object?, Object?>? wire) {
    if (wire == null) return DesktopControlBindings.defaults();
    final wireVersion = wire['version'];
    if (wireVersion != 1 && wireVersion != version) return recoveredDefaults();
    try {
      final activation = Map<Object?, Object?>.from(wire['activation'] as Map);
      final rawActions = Map<Object?, Object?>.from(wire['actions'] as Map);
      if (actionIds.any((id) => !rawActions.containsKey(id))) {
        return recoveredDefaults();
      }
      return DesktopControlBindings(
        activationVirtualKey: activation['virtualKey'] as int,
        activationModifiers: activation['modifiers'] as int,
        actions: {
          for (final id in actionIds)
            id: ((rawActions[id] as List?) ?? const [])
                .map(DesktopPhysicalKey.fromWire)
                .toList(),
        },
        migratedFromLegacy: wireVersion == 1,
      );
    } catch (_) {
      return recoveredDefaults();
    }
  }

  String encode() => jsonEncode(toWire(includeLabels: true));

  static DesktopControlBindings recoveredDefaults() => DesktopControlBindings(
    activationVirtualKey: 0x47,
    activationModifiers: 0x0003,
    actions: DesktopControlBindings.defaults().actions,
    recoveredInvalidData: true,
  );

  factory DesktopControlBindings.decode(String? value) {
    if (value == null) return DesktopControlBindings.defaults();
    try {
      return DesktopControlBindings.fromWire(
        Map<Object?, Object?>.from(jsonDecode(value) as Map),
      );
    } catch (_) {
      return recoveredDefaults();
    }
  }

  String? get localConflict {
    final seen = <DesktopPhysicalKey, String>{};
    for (final id in actionIds) {
      for (final key in actions[id] ?? const []) {
        final previous = seen[key];
        if (previous != null) {
          return '${actionLabels[previous]} et ${actionLabels[id]} utilisent ${key.displayLabel}.';
        }
        seen[key] = id;
      }
    }
    if (activationVirtualKey == 0x20 && activationModifiers == 0x0003) {
      return 'Le raccourci global doit rester distinct de Ctrl+Alt+Espace.';
    }
    return null;
  }
}

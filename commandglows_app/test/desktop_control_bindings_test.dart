import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/platform/desktop_control_bindings.dart';

void main() {
  test(
    'defaults and local persistence keep Space and F1 click aliases and F9 reset',
    () {
      final defaults = DesktopControlBindings.defaults();
      expect(defaults.actions['leftClick']!.map((key) => key.displayLabel), [
        'Espace',
        'F1',
      ]);
      expect(defaults.actions['reset']!.single.displayLabel, 'F9');
      final restored = DesktopControlBindings.decode(defaults.encode());
      expect(restored.toWire(), defaults.toWire());
    },
  );

  test('detects duplicate physical assignments and text-overlay collision', () {
    final defaults = DesktopControlBindings.defaults();
    final duplicate = defaults.copyWith(
      actions: {
        ...defaults.actions,
        'rightClick': [const DesktopPhysicalKey(0x39)],
      },
    );
    expect(duplicate.localConflict, contains('Espace'));
    expect(
      defaults.copyWith(activationVirtualKey: 0x20).localConflict,
      contains('Ctrl+Alt+Espace'),
    );
  });

  test(
    'migrates v1 action bindings as unmodified keys without dropping data',
    () {
      final v1 = DesktopControlBindings.defaults().toWire();
      v1['version'] = 1;
      final restored = DesktopControlBindings.fromWire(v1);
      expect(restored.recoveredInvalidData, isFalse);
      expect(restored.migratedFromLegacy, isTrue);
      expect(restored.actions['leftClick']!.map((key) => key.displayLabel), [
        'Espace',
        'F1',
      ]);
      expect(restored.toWire()['version'], 3);
      expect(restored.toWire()['actions'], isNotNull);
    },
  );

  test('distinguishes the same physical key with different modifiers', () {
    const plain = DesktopPhysicalKey(0x02, false, '1');
    const shifted = DesktopPhysicalKey(0x02, false, '1', 4);
    expect(plain.displayLabel, '1');
    expect(shifted.displayLabel, 'Maj+1');
    expect(plain, isNot(shifted));
  });

  test(
    'invalid saved versions recover to defaults and expose recovery state',
    () {
      final recovered = DesktopControlBindings.fromWire({'version': 99});
      expect(recovered.recoveredInvalidData, isTrue);
      expect(recovered.actions['leftClick']!.map((key) => key.displayLabel), [
        'Espace',
        'F1',
      ]);
    },
  );
}

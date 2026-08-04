import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_models.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_theme_validation.dart';

void main() {
  test('ships the full v1 preset catalog', () {
    expect(KeyboardThemePresetCatalog.presets, hasLength(9));
    expect(
      KeyboardThemePresetCatalog.presets.map((preset) => preset.name),
      containsAll([
        'CommandGlows',
        'Glass Mint',
        'Midnight Aurora',
        'Paper Ink',
        'Pixel Candy',
        'Minimal Contrast',
      ]),
    );
  });

  test(
    'resolves preset colors from brightness without changing preset choice',
    () {
      final light = KeyboardThemePresetCatalog.configFor(
        KeyboardThemePresetCatalog.pixelCandy,
        brightness: Brightness.light,
      );
      final dark = KeyboardThemePresetCatalog.configFor(
        KeyboardThemePresetCatalog.pixelCandy,
        brightness: Brightness.dark,
      );

      expect(light.presetId, KeyboardThemePresetCatalog.pixelCandy);
      expect(dark.presetId, KeyboardThemePresetCatalog.pixelCandy);
      expect(light.backgroundStartColor, isNot(dark.backgroundStartColor));
      expect(dark.textColor, 0xFFFFF4FF);
    },
  );

  test('keeps preset palettes automatic after non-color overrides', () {
    final lightWithRelief =
        KeyboardThemePresetCatalog.configFor(
          KeyboardThemePresetCatalog.glassMint,
          brightness: Brightness.light,
        ).copyWith(
          keyReliefEnabled: true,
          keyReliefDepth: 4,
          keyboardOpacity: 0.72,
          pressEffect: KeyboardThemePressEffect.keycapTilt,
        );

    final dark = KeyboardThemePresetCatalog.resolveVariantForBrightness(
      lightWithRelief,
      brightness: Brightness.dark,
    );
    final darkPreset = KeyboardThemePresetCatalog.configFor(
      KeyboardThemePresetCatalog.glassMint,
      brightness: Brightness.dark,
    );

    expect(dark.presetId, KeyboardThemePresetCatalog.glassMint);
    expect(dark.backgroundStartColor, darkPreset.backgroundStartColor);
    expect(dark.keyColor, darkPreset.keyColor);
    expect(dark.textColor, darkPreset.textColor);
    expect(dark.keyReliefEnabled, isTrue);
    expect(dark.keyReliefDepth, 4);
    expect(dark.keyboardOpacity, 0.72);
    expect(dark.pressEffect, KeyboardThemePressEffect.keycapTilt);

    final light = KeyboardThemePresetCatalog.resolveVariantForBrightness(
      dark,
      brightness: Brightness.light,
    );
    expect(light.backgroundStartColor, lightWithRelief.backgroundStartColor);
    expect(light.keyReliefEnabled, isTrue);
  });

  test('does not replace custom palette colors with preset variants', () {
    final custom = KeyboardThemePresetCatalog.configFor(
      KeyboardThemePresetCatalog.glassMint,
    ).copyWith(keyColor: 0xFF123456);

    final resolved = KeyboardThemePresetCatalog.resolveVariantForBrightness(
      custom,
      brightness: Brightness.dark,
    );

    expect(resolved.keyColor, 0xFF123456);
    expect(resolved.backgroundStartColor, custom.backgroundStartColor);
  });

  test('all preset light and dark variants pass theme contrast validation', () {
    for (final preset in KeyboardThemePresetCatalog.presets) {
      for (final brightness in Brightness.values) {
        final result = KeyboardThemeValidator.validate(
          KeyboardThemePresetCatalog.configFor(
            preset.id,
            brightness: brightness,
          ),
        );

        expect(
          result.errors,
          isEmpty,
          reason: '${preset.name} ${brightness.name}',
        );
      }
    }
  });

  test('round-trips advanced theme fields', () {
    final config = KeyboardThemeConfig.defaults().copyWith(
      presetId: KeyboardThemePresetCatalog.midnightAurora,
      useGradient: true,
      gradientStyle: KeyboardThemeGradientStyle.radial,
      borderWidth: 1.5,
      keyReliefEnabled: true,
      keyReliefDepth: 3,
      keyRadius: 14,
      keyHorizontalGap: 0,
      rowVerticalGap: 10,
      shadowBlur: 9,
      shadowOffsetY: 2,
      pressHighlightDurationMs: 850,
      cornerTextOpacity: 0.5,
      keyboardOpacity: 0.55,
      pressEffect: KeyboardThemePressEffect.electricArc,
      effectEasing: KeyboardThemeEffectEasing.spring,
    );

    final parsed = KeyboardThemeConfig.fromMap(config.toMap());

    expect(parsed.gradientStyle, KeyboardThemeGradientStyle.radial);
    expect(parsed.borderWidth, 1.5);
    expect(parsed.keyReliefEnabled, isTrue);
    expect(parsed.keyReliefDepth, 3);
    expect(parsed.keyRadius, 14);
    expect(parsed.keyHorizontalGap, 0);
    expect(parsed.rowVerticalGap, 12);
    expect(parsed.shadowBlur, 9);
    expect(parsed.pressHighlightDurationMs, 850);
    expect(parsed.cornerTextOpacity, 0.5);
    expect(parsed.keyboardOpacity, 0.55);
    expect(parsed.pressEffect, KeyboardThemePressEffect.electricArc);
    expect(parsed.effectEasing, KeyboardThemeEffectEasing.spring);
  });

  test('maps legacy glow effect to garland', () {
    final parsed = KeyboardThemeConfig.fromMap({'pressEffect': 'glow'});

    expect(parsed.pressEffect, KeyboardThemePressEffect.garland);
    expect(parsed.toMap()['pressEffect'], KeyboardThemePressEffect.garland.name);
  });

  test('round-trips expressive press effects', () {
    for (final effect in [
      KeyboardThemePressEffect.waterSplash,
      KeyboardThemePressEffect.emberBurst,
      KeyboardThemePressEffect.dragonTrail,
      KeyboardThemePressEffect.spiderTrail,
    ]) {
      final parsed = KeyboardThemeConfig.fromMap({'pressEffect': effect.name});

      expect(parsed.pressEffect, effect);
      expect(parsed.toMap()['pressEffect'], effect.name);
    }
  });

  test('warns when expressive effects run too long', () {
    final result = KeyboardThemeValidator.validate(
      KeyboardThemeConfig.defaults().copyWith(
        pressEffect: KeyboardThemePressEffect.dragonTrail,
        effectDurationMs: 420,
      ),
    );

    expect(result.errors, isEmpty);
    expect(
      result.warnings,
      contains('Expressive effects are capped natively for performance.'),
    );
  });

  test('ignores legacy key width scale', () {
    final parsed = KeyboardThemeConfig.fromMap({'keyWidthScale': 0.75});

    expect(parsed.keyWidthScale, 1);
    expect(parsed.toMap().containsKey('keyWidthScale'), isFalse);
    expect(parsed.copyWith(keyWidthScale: 0.75).keyWidthScale, 1);
  });

  test('clamps pressed color hold duration', () {
    expect(
      KeyboardThemeConfig.fromMap({
        'pressHighlightDurationMs': -25,
      }).pressHighlightDurationMs,
      0,
    );
    expect(
      KeyboardThemeConfig.fromMap({
        'pressHighlightDurationMs': 3000,
      }).pressHighlightDurationMs,
      1200,
    );
  });

  test('caps corner text opacity at eighty five percent', () {
    expect(
      KeyboardThemeConfig.fromMap({
        'cornerTextOpacity': -0.25,
      }).cornerTextOpacity,
      0,
    );
    expect(
      KeyboardThemeConfig.fromMap({'cornerTextOpacity': 1.0}).cornerTextOpacity,
      0.85,
    );
  });

  test('clamps keyboard opacity to usable range', () {
    expect(
      KeyboardThemeConfig.fromMap({'keyboardOpacity': -0.25}).keyboardOpacity,
      0.25,
    );
    expect(
      KeyboardThemeConfig.fromMap({'keyboardOpacity': 1.5}).keyboardOpacity,
      1,
    );
  });

  test('accepts default theme contrast', () {
    final result = KeyboardThemeValidator.validate(
      KeyboardThemeConfig.defaults(),
    );

    expect(result.canSave, isTrue);
    expect(result.errors, isEmpty);
  });

  test('blocks unreadable key labels', () {
    final result = KeyboardThemeValidator.validate(
      KeyboardThemeConfig.defaults().copyWith(
        presetId: KeyboardThemePresetCatalog.commandglowsLight,
        keyColor: 0xFF111111,
        specialKeyColor: 0xFF111111,
        pressedKeyColor: 0xFF111111,
        textColor: 0xFF111111,
      ),
    );

    expect(result.canSave, isFalse);
    expect(result.errors.join('\n'), contains('Key label contrast'));
  });

  test('blocks image background without imported image', () {
    final result = KeyboardThemeValidator.validate(
      KeyboardThemeConfig.defaults().copyWith(useImage: true),
    );

    expect(result.canSave, isFalse);
    expect(result.errors.join('\n'), contains('imported local image'));
  });
}

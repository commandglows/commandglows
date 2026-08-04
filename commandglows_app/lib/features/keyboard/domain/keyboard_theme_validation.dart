import 'dart:math' as math;

import 'keyboard_models.dart';

class KeyboardThemeValidationResult {
  const KeyboardThemeValidationResult({
    this.errors = const [],
    this.warnings = const [],
  });

  final List<String> errors;
  final List<String> warnings;

  bool get canSave => errors.isEmpty;
}

class KeyboardThemeValidator {
  const KeyboardThemeValidator._();

  static KeyboardThemeValidationResult validate(KeyboardThemeConfig config) {
    final errors = <String>[];
    final warnings = <String>[];

    void requireContrast(String label, int backgroundColor, int textColor) {
      final ratio = _contrastRatio(backgroundColor, textColor);
      if (ratio < 4.5) {
        errors.add(
          '$label contrast is ${ratio.toStringAsFixed(1)}:1; minimum is 4.5:1.',
        );
      }
    }

    requireContrast('Key label', config.keyColor, config.textColor);
    requireContrast(
      'Special key label',
      config.specialKeyColor,
      config.textColor,
    );
    requireContrast(
      'Pressed key label',
      config.pressedKeyColor,
      config.textColor,
    );
    requireContrast(
      'Status text',
      config.backgroundStartColor,
      config.statusTextColor,
    );

    if (config.useImage && config.backgroundImagePath == null) {
      errors.add('Image background needs an imported local image.');
    }
    if (config.pressEffect != KeyboardThemePressEffect.none &&
        config.effectIntensity > 0.85) {
      warnings.add('High effect intensity can make fast typing feel busy.');
    }
    if (config.shadowBlur > 14) {
      warnings.add('Large key shadows can reduce keyboard performance.');
    }
    if (config.borderWidth > 3) {
      warnings.add('Thick borders reduce available key label space.');
    }
    if ((_isParticleEffect(config.pressEffect) ||
            _isMascotEffect(config.pressEffect)) &&
        config.effectDurationMs > 360) {
      warnings.add('Expressive effects are capped natively for performance.');
    }

    return KeyboardThemeValidationResult(errors: errors, warnings: warnings);
  }

  static double _contrastRatio(int colorA, int colorB) {
    final a = _relativeLuminance(colorA);
    final b = _relativeLuminance(colorB);
    final lighter = math.max(a, b);
    final darker = math.min(a, b);
    return (lighter + 0.05) / (darker + 0.05);
  }

  static double _relativeLuminance(int color) {
    double channel(int shift) {
      final value = ((color >> shift) & 0xFF) / 255.0;
      return value <= 0.03928
          ? value / 12.92
          : math.pow((value + 0.055) / 1.055, 2.4).toDouble();
    }

    return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  }

  static bool _isParticleEffect(KeyboardThemePressEffect effect) {
    return effect == KeyboardThemePressEffect.confettiLite ||
        effect == KeyboardThemePressEffect.fireworksLite ||
        effect == KeyboardThemePressEffect.waterSplash ||
        effect == KeyboardThemePressEffect.emberBurst;
  }

  static bool _isMascotEffect(KeyboardThemePressEffect effect) {
    return effect == KeyboardThemePressEffect.dragonTrail ||
        effect == KeyboardThemePressEffect.spiderTrail;
  }
}

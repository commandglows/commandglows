import 'dart:convert';
import 'dart:io';

import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/core/theme/commandglows_theme_tokens.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_models.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final fixture = _loadFixture();

  test('app semantic aliases and bundled font match the frozen mapping', () {
    final mapping = Map<String, Object?>.from(
      fixture['sourceMapping']! as Map,
    );

    expect(AppTypography.fontFamily, mapping['fontBodyFamily']);
    expect(CommandGlowsThemeTokens.fontDisplay, mapping['fontDisplayFamily']);
    expect(AppTypography.base, mapping['semanticBaseSize']);
    expect(
      AppTypography.compactBodyCompatibility,
      mapping['resolvedCompactBodySize'],
    );
    expect(AppColors.info.toARGB32(), mapping['semanticInfoArgb']);
    expect(
      AppColors.localOnlyCompatibility.toARGB32(),
      mapping['resolvedLocalOnlyCompatibilityArgb'],
    );
    expect(AppColors.primary.toARGB32(), mapping['semanticPrimaryLightArgb']);
    expect(
      AppColors.primaryDark.toARGB32(),
      mapping['semanticPrimaryDarkArgb'],
    );
    expect(AppColors.seedLight.toARGB32(), mapping['resolvedSeedLightArgb']);
  });

  test('preset IDs remain compatible and legacy IDs only normalize on read', () {
    final frozenPresetIds = (fixture['presetIds']! as List).cast<String>();
    expect(
      KeyboardThemePresetCatalog.presets.map((preset) => preset.id).toList(),
      frozenPresetIds,
    );

    for (final legacyId in (fixture['legacyPresetIds']! as List).cast<String>()) {
      final parsed = KeyboardThemeConfig.fromMap({'presetId': legacyId});
      expect(parsed.presetId, KeyboardThemePresetCatalog.commandglows);
    }
  });

  test('frozen custom KeyboardThemeConfig v1 round-trips without rewrite', () {
    final frozen = Map<String, Object?>.from(fixture['themeV1']! as Map);
    final parsed = KeyboardThemeConfig.fromMap(frozen);

    expect(parsed.version, 1);
    expect(parsed.useImage, isTrue);
    expect(parsed.backgroundImagePath, 'C:/fixtures/keyboard-theme.png');
    expect(parsed.toMap(), frozen);
  });

  for (final fixtureName in ['syncV1', 'syncV2']) {
    test('$fixtureName cloud profile checksum and revision round-trip', () {
      final frozen = Map<String, Object?>.from(fixture[fixtureName]! as Map);
      final parsed = KeyboardSyncProfile.fromMap(frozen);

      expect(parsed.validate().isValid, isTrue);
      expect(parsed.profileRevision, frozen['profileRevision']);
      expect(parsed.baseCloudRevision, frozen['baseCloudRevision']);
      expect(parsed.checksum, frozen['checksum']);
      expect(parsed.toMap(), frozen);
    });
  }

  test('Flutter theme consumes reconciled aliases without changing body size', () {
    expect(AppTheme.light.colorScheme.primary, AppColors.primary);
    expect(AppTheme.dark.colorScheme.primary, AppColors.primaryDark);
    expect(
      AppTheme.light.textTheme.bodyLarge?.fontSize,
      AppTypography.compactBodyCompatibility,
    );
    expect(AppTheme.light.textTheme.bodyLarge?.fontFamily, 'Inter');
  });
}

Map<String, Object?> _loadFixture() {
  final file = File(
    'android/app/src/test/resources/fixtures/'
    'design_system_app_native_v1.json',
  );
  return Map<String, Object?>.from(jsonDecode(file.readAsStringSync()) as Map);
}

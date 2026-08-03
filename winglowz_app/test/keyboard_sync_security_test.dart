import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_policy.dart';

void main() {
  test('redacts sensitive shortcuts from corner config', () {
    final sanitized = KeyboardSyncPolicyV1.sanitizePayload({
      'cornerConfig': {
        'overrides': [
          {
            'keyId': 'a',
            'slot': 'topLeft',
            'expression': "'hello'",
            'sensitive': false,
            'disabled': false,
          },
          {
            'keyId': 'b',
            'slot': 'topRight',
            'expression': "clipboard:pasteLast",
            'sensitive': true,
            'label': 'paste',
            'disabled': false,
          },
        ],
      },
    });

    final overrides =
        (sanitized['cornerConfig'] as Map<String, Object?>)['overrides']
            as List<Object?>;
    final first = overrides[0] as Map<String, Object?>;
    final second = overrides[1] as Map<String, Object?>;

    expect(first['expression'], "'hello'");
    expect(second['redacted'], isTrue);
    expect(second['disabled'], isTrue);
    expect(second.containsKey('expression'), isFalse);
    expect(second.containsKey('label'), isFalse);
  });

  test('removes image paths and bytes from theme config', () {
    final sanitized = KeyboardSyncPolicyV1.sanitizePayload({
      'themeConfig': {
        'presetId': 'custom',
        'useImage': true,
        'imagePath': '/storage/emulated/0/Pictures/private.png',
        'backgroundImageBytes': 'AAAABBBB',
      },
    });

    final theme = sanitized['themeConfig'] as Map<String, Object?>;
    expect(theme['useImage'], isFalse);
    expect(theme.containsKey('imagePath'), isFalse);
    expect(theme.containsKey('backgroundImageBytes'), isFalse);
  });

  test('drops forbidden top-level keys from payload', () {
    final sanitized = KeyboardSyncPolicyV1.sanitizePayload({
      'preferences': {'themeMode': 'dark'},
      'clipboard': {'items': []},
      'diagnostics': {'raw': 'stack'},
      'recents': ['a', 'b'],
      'voiceArtifacts': {'path': '/data/user/0/raw.wav'},
    });

    expect(sanitized.keys, contains('preferences'));
    expect(sanitized.keys, isNot(contains('clipboard')));
    expect(sanitized.keys, isNot(contains('diagnostics')));
    expect(sanitized.keys, isNot(contains('recents')));
    expect(sanitized.keys, isNot(contains('voiceArtifacts')));
  });

  test(
    'removes secrets, clipboard, raw dictation and image bytes at depth',
    () {
      final sanitized = KeyboardSyncPolicyV1.sanitizePayload({
        'metadata': {
          'apiToken': 'abc123',
          'clipboardText': 'should_not_sync',
          'rawVoiceArtifactsPath': '/storage/emulated/0/raw.m4a',
          'nested': {'secretKey': 'xyz', 'imageBytes': 'AAAA'},
        },
      });

      final metadata = sanitized['metadata'] as Map<String, Object?>;
      expect(metadata.containsKey('apiToken'), isFalse);
      expect(metadata.containsKey('clipboardText'), isFalse);
      expect(metadata.containsKey('rawVoiceArtifactsPath'), isFalse);
      final nested = metadata['nested'] as Map<String, Object?>;
      expect(nested.containsKey('secretKey'), isFalse);
      expect(nested.containsKey('imageBytes'), isFalse);
    },
  );

  test('v2 allows safe theme asset manifest without local path', () {
    final sanitized = KeyboardSyncPolicyV2.sanitizePayload({
      'themeConfig': {
        'presetId': 'custom',
        'useImage': true,
        'backgroundImagePath': '/data/user/0/private.png',
      },
      'themeAsset': {
        'assetId': 'asset-1',
        'storagePath': 'users/firebase-a/keyboard_theme_assets/asset-1',
        'checksum': 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd',
        'byteSize': 2048,
        'mimeType': 'image/png',
        'profileRevision': 4,
        'createdAt': '2026-05-25T16:00:00Z',
        'updatedAt': '2026-05-25T16:00:00Z',
      },
    });

    final theme = sanitized['themeConfig'] as Map<String, Object?>;
    expect(theme['useImage'], isTrue);
    expect(theme.containsKey('backgroundImagePath'), isFalse);
    expect(sanitized['themeAsset'], isA<Map<String, Object?>>());
  });
}

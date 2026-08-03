import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_models.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_policy.dart';

void main() {
  test('sanitized profile round-trips and validates', () {
    final profile = KeyboardSyncProfile.sanitized(
      profileRevision: 3,
      baseCloudRevision: 2,
      updatedAt: '2026-05-25T16:00:00Z',
      updatedByDeviceId: 'device-a',
      sourcePlatform: 'android',
      rawPayload: {
        'preferences': {'themeMode': 'system', 'keySoundEnabled': false},
        'themeConfig': {'presetId': 'commandglows_light', 'useImage': true},
        'themeAsset': {
          'assetId': 'asset-1',
          'storagePath': 'users/firebase-a/keyboard_theme_assets/asset-1',
          'checksum': 'abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd',
          'byteSize': 1024,
          'mimeType': 'image/png',
          'profileRevision': 3,
          'createdAt': '2026-05-25T16:00:00Z',
          'updatedAt': '2026-05-25T16:00:00Z',
        },
        'cornerConfig': {
          'overrides': [
            {
              'keyId': 'e',
              'slot': 'topRight',
              'expression': "'é'",
              'sensitive': false,
              'disabled': false,
            },
          ],
        },
      },
    );

    final parsed = KeyboardSyncProfile.fromMap(profile.toMap());
    expect(parsed.validate().isValid, isTrue);
    expect(parsed.themeAsset, isNotNull);
    expect(parsed.toMap(), profile.toMap());
  });

  test('checksum is deterministic regardless of map insertion order', () {
    final checksumA = KeyboardSyncProfile.computeChecksum(
      schemaVersion: 2,
      profileRevision: 10,
      baseCloudRevision: 9,
      updatedAt: '2026-05-25T16:10:00Z',
      updatedByDeviceId: 'd-1',
      sourcePlatform: 'android',
      sanitizationPolicy: KeyboardSyncPolicyV2.id,
      payload: {
        'preferences': {'b': 2, 'a': 1},
        'metadata': {'k2': 'v2', 'k1': 'v1'},
      },
    );
    final checksumB = KeyboardSyncProfile.computeChecksum(
      schemaVersion: 2,
      profileRevision: 10,
      baseCloudRevision: 9,
      updatedAt: '2026-05-25T16:10:00Z',
      updatedByDeviceId: 'd-1',
      sourcePlatform: 'android',
      sanitizationPolicy: KeyboardSyncPolicyV2.id,
      payload: {
        'metadata': {'k1': 'v1', 'k2': 'v2'},
        'preferences': {'a': 1, 'b': 2},
      },
    );

    expect(checksumA, checksumB);
  });

  test('rejects invalid schema version', () {
    final profile = KeyboardSyncProfile.fromMap({
      ...KeyboardSyncProfile.sanitized(
        profileRevision: 1,
        baseCloudRevision: 0,
        updatedAt: '2026-05-25T16:20:00Z',
        updatedByDeviceId: 'd-2',
        sourcePlatform: 'android',
        rawPayload: {
          'preferences': {'themeMode': 'dark'},
        },
      ).toMap(),
      'schemaVersion': 999,
    });

    expect(
      profile.validate().verdict,
      KeyboardSyncValidationVerdict.invalidSchemaVersion,
    );
  });

  test('rejects oversized payload', () {
    final tooLarge = 'x' * (KeyboardSyncPolicyV2.maxProfileBytes + 2048);
    final profile = KeyboardSyncProfile.sanitized(
      profileRevision: 5,
      baseCloudRevision: 4,
      updatedAt: '2026-05-25T16:30:00Z',
      updatedByDeviceId: 'd-3',
      sourcePlatform: 'android',
      rawPayload: {
        'preferences': {'themeMode': 'light'},
        'metadata': {'note': tooLarge},
      },
    );

    expect(
      profile.validate().verdict,
      KeyboardSyncValidationVerdict.oversizedPayload,
    );
  });
}

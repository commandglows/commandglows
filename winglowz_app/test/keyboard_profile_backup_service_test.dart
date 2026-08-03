import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/keyboard/application/keyboard_profile_backup_service.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_models.dart';

void main() {
  test('exports, previews and applies a valid keyboard backup', () async {
    final localProfile = KeyboardSyncProfile.sanitized(
      profileRevision: 3,
      baseCloudRevision: 2,
      updatedAt: '2026-05-25T20:00:00Z',
      updatedByDeviceId: 'device-a',
      sourcePlatform: 'android',
      rawPayload: {
        'preferences': {'themeMode': 'dark'},
        'cornerConfig': {
          'overrides': [
            {
              'keyId': 'a',
              'slot': 'topLeft',
              'expression': "'é'",
              'disabled': false,
            },
          ],
        },
      },
    );
    KeyboardSyncProfile? applied;
    final service = KeyboardProfileBackupService(
      exportLocalProfile: () async => localProfile,
      applyLocalProfile: (profile) async => applied = profile,
      clock: () => DateTime.utc(2026, 5, 25, 20, 5),
    );

    final exported = await service.exportBackup();
    final preview = await service.previewImport(exported.toJson(pretty: false));
    await service.applyImport(preview);

    expect(exported.payload['backupVersion'], 1);
    expect(preview.profile.checksum, localProfile.checksum);
    expect(applied?.checksum, localProfile.checksum);
    expect(preview.payloadBytes, greaterThan(10));
  });

  test('rejects invalid JSON and unsupported backup version', () async {
    final profile = KeyboardSyncProfile.sanitized(
      profileRevision: 1,
      baseCloudRevision: 0,
      updatedAt: '2026-05-25T20:00:00Z',
      updatedByDeviceId: 'device-b',
      sourcePlatform: 'android',
      rawPayload: {
        'preferences': {'themeMode': 'light'},
      },
    );
    final service = KeyboardProfileBackupService(
      exportLocalProfile: () async => profile,
      applyLocalProfile: (_) async {},
    );

    await expectLater(
      () => service.previewImport('{broken'),
      throwsA(isA<KeyboardProfileBackupException>()),
    );
    await expectLater(
      () => service.previewImport(
        jsonEncode({'backupVersion': 99, 'profile': profile.toMap()}),
      ),
      throwsA(isA<KeyboardProfileBackupException>()),
    );
  });

  test('rejects invalid imported checksum', () async {
    final profile = KeyboardSyncProfile.sanitized(
      profileRevision: 2,
      baseCloudRevision: 1,
      updatedAt: '2026-05-25T20:00:00Z',
      updatedByDeviceId: 'device-c',
      sourcePlatform: 'android',
      rawPayload: {
        'preferences': {'themeMode': 'system'},
      },
    );
    final invalid = {...profile.toMap(), 'checksum': 'invalid'};
    final service = KeyboardProfileBackupService(
      exportLocalProfile: () async => profile,
      applyLocalProfile: (_) async {},
    );

    await expectLater(
      () => service.previewImport(
        jsonEncode({'backupVersion': 1, 'profile': invalid}),
      ),
      throwsA(isA<KeyboardProfileBackupException>()),
    );
  });

  test('exported backup excludes sensitive fields', () async {
    final profile = KeyboardSyncProfile.sanitized(
      profileRevision: 1,
      baseCloudRevision: 0,
      updatedAt: '2026-05-25T20:00:00Z',
      updatedByDeviceId: 'device-d',
      sourcePlatform: 'android',
      rawPayload: {
        'preferences': {'themeMode': 'dark'},
        'clipboard': {'raw': 'do-not-export'},
        'themeConfig': {
          'imagePath': '/storage/private/path.png',
          'useImage': true,
        },
      },
    );
    final service = KeyboardProfileBackupService(
      exportLocalProfile: () async => profile,
      applyLocalProfile: (_) async {},
    );

    final exported = await service.exportBackup();
    final jsonText = exported.toJson(pretty: false);

    expect(jsonText.contains('clipboard'), isFalse);
    expect(jsonText.contains('/storage/private/path.png'), isFalse);
    expect(jsonText.contains('token'), isFalse);
  });
}

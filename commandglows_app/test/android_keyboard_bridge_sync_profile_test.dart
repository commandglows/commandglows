import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/platform/android_keyboard_bridge.dart';
import 'package:commandglows_app/features/custom_action_buttons/domain/custom_action_buttons.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_sync_models.dart';

const _keyboardChannel = MethodChannel('commandglows_app/keyboard');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, null);
  });

  test(
    'setCustomActionBarConfig sends bounded typed actions to native bridge',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      MethodCall? captured;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_keyboardChannel, (call) async {
            captured = call;
            return {
              'supported': true,
              'enabled': true,
              'active': true,
              'customActionBarEnabled': true,
            };
          });

      final status = await AndroidKeyboardBridge.setCustomActionBarConfig(
        const CustomActionButtonImeConfig(
          enabled: true,
          actions: [
            CustomActionButtonImeAction(
              id: 'button-1',
              title: 'Bonjour',
              icon: CustomActionButtonIcon.spark,
              type: CustomActionButtonImeActionType.insertText,
              value: 'Bonjour Diane',
              orderIndex: 0,
              sensitive: true,
            ),
          ],
        ),
      );

      expect(captured?.method, 'setKeyboardCustomActionBarConfig');
      expect(captured?.arguments, isA<Map<Object?, Object?>>());
      final payload = captured!.arguments as Map<Object?, Object?>;
      expect(payload['enabled'], isTrue);
      final actions = payload['actions'] as List<Object?>;
      expect(actions, hasLength(1));
      expect(actions.single, containsPair('type', 'insertText'));
      expect(actions.single, containsPair('sensitive', true));
      expect(status.customActionBarEnabled, isTrue);
    },
  );

  test(
    'exportKeyboardSyncProfile returns null on unsupported platform',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      final profile = await AndroidKeyboardBridge.exportKeyboardSyncProfile();
      expect(profile, isNull);
    },
  );

  test('exportKeyboardSyncProfile parses valid native map', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    final expected = KeyboardSyncProfile.sanitized(
      profileRevision: 4,
      baseCloudRevision: 3,
      updatedAt: '2026-05-25T16:00:00Z',
      updatedByDeviceId: 'device-a',
      sourcePlatform: 'android',
      rawPayload: {
        'preferences': {'themeMode': 'system'},
        'themeConfig': {'presetId': 'commandglows', 'useImage': false},
      },
    );
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, (call) async {
          if (call.method == 'exportKeyboardSyncProfile') {
            return expected.toMap();
          }
          return null;
        });

    final parsed = await AndroidKeyboardBridge.exportKeyboardSyncProfile();
    expect(parsed, isNotNull);
    expect(parsed!.toMap(), expected.toMap());
  });

  test(
    'exportKeyboardSyncProfile fills checksum for native blank checksum',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      final expected = KeyboardSyncProfile.sanitized(
        profileRevision: 4,
        baseCloudRevision: 3,
        updatedAt: '2026-05-25T16:00:00Z',
        updatedByDeviceId: 'device-a',
        sourcePlatform: 'android',
        rawPayload: {
          'preferences': {'themeMode': 'system'},
          'themeConfig': {'presetId': 'commandglows', 'useImage': false},
        },
      );
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_keyboardChannel, (call) async {
            if (call.method == 'exportKeyboardSyncProfile') {
              return {...expected.toMap(), 'checksum': ''};
            }
            return null;
          });

      final parsed = await AndroidKeyboardBridge.exportKeyboardSyncProfile();

      expect(parsed, isNotNull);
      expect(parsed!.checksum, expected.checksum);
      expect(parsed.validate().isValid, isTrue);
    },
  );

  test(
    'applyKeyboardSyncProfile rejects invalid profile before native invoke',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      var nativeInvoked = false;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_keyboardChannel, (call) async {
            nativeInvoked = true;
            return null;
          });

      final valid = KeyboardSyncProfile.sanitized(
        profileRevision: 1,
        baseCloudRevision: 0,
        updatedAt: '2026-05-25T16:10:00Z',
        updatedByDeviceId: 'device-b',
        sourcePlatform: 'android',
        rawPayload: {
          'preferences': {'themeMode': 'dark'},
        },
      );
      final invalid = KeyboardSyncProfile.fromMap({
        ...valid.toMap(),
        'checksum': 'invalid-checksum',
      });

      await expectLater(
        () => AndroidKeyboardBridge.applyKeyboardSyncProfile(invalid),
        throwsA(isA<AndroidKeyboardBridgeException>()),
      );
      expect(nativeInvoked, isFalse);
    },
  );

  test('applyKeyboardSyncProfile invokes expected native method', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    final calls = <MethodCall>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, (call) async {
          calls.add(call);
          return {'applied': true};
        });

    final profile = KeyboardSyncProfile.sanitized(
      profileRevision: 8,
      baseCloudRevision: 7,
      updatedAt: '2026-05-25T16:20:00Z',
      updatedByDeviceId: 'device-c',
      sourcePlatform: 'android',
      rawPayload: {
        'preferences': {'themeMode': 'light'},
      },
    );

    await AndroidKeyboardBridge.applyKeyboardSyncProfile(profile);
    expect(calls.single.method, 'applyKeyboardSyncProfile');
  });
}

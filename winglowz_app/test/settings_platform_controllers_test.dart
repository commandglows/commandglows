import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/platform/android_keyboard_bridge.dart';
import 'package:commandglows_app/features/keyboard/domain/keyboard_models.dart';
import 'package:commandglows_app/features/settings/application/settings_platform_controllers.dart';

const _keyboardChannel = MethodChannel('commandglows_app/keyboard');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, null);
  });

  test(
    'SettingsKeyboardController merges preference patch with current status',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      final calls = <MethodCall>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_keyboardChannel, (call) async {
            calls.add(call);
            return Map<Object?, Object?>.from(call.arguments as Map);
          });

      final current = AndroidKeyboardStatus.fromMap({
        'supported': true,
        'enabled': true,
        'active': true,
        'voiceEnabled': true,
        'clipboardSyncDesired': false,
        'mediaControlsEnabled': true,
        'mediaVolumeStepPercent': 15,
        'mediaBrightnessStepPercent': 20,
        'layoutProfile': 'qwerty',
        'cornerModeEnabled': false,
        'debugTouchOverlayEnabled': false,
        'keyVibrationEnabled': true,
        'keyVibrationIntensity': 3,
        'keySoundEnabled': false,
        'spellingSuggestionsEnabled': true,
        'specialKeyCornersEnabled': false,
        'frenchLanguageEnabled': true,
        'englishLanguageEnabled': true,
        'doubleSpacePeriodEnabled': true,
        'punctuationAutoSpacingEnabled': false,
        'autoCloseModesEnabled': true,
        'actionRowHeightScale': 0.6,
        'privacyMode': 'auto',
        'lastKeyboardError': 'token=[REDACTED_SECRET]',
        'lastKeyboardErrorAt': '2026-05-16T08:00:00Z',
        'keyboardRecoveryCount': 2,
      });

      final status = await const SettingsKeyboardController().setPreferences(
        current: current,
        layoutProfile: KeyboardLayoutProfile.azerty,
        clipboardSyncDesired: true,
        clipboardSensitiveFieldHistoryEnabled: true,
        privacyMode: KeyboardPrivacyMode.strict,
        autoCloseModesEnabled: false,
      );

      expect(status.layoutProfile, KeyboardLayoutProfile.azerty);
      expect(status.clipboardSyncDesired, isTrue);
      expect(status.clipboardSensitiveFieldHistoryEnabled, isTrue);
      expect(status.mediaVolumeStepPercent, 15);
      expect(status.mediaBrightnessStepPercent, 20);
      expect(status.actionRowHeightScale, closeTo(2 / 3, 0.0001));
      expect(status.privacyMode, KeyboardPrivacyMode.strict);
      expect(status.autoCloseModesEnabled, isFalse);
      expect(status.voiceEnabled, isTrue);
      expect(status.keyVibrationIntensity, 3);
      expect(calls.single.method, 'setKeyboardPreferences');
      expect(calls.single.arguments, containsPair('layoutProfile', 'azerty'));
      expect(
        calls.single.arguments,
        containsPair('clipboardSyncDesired', true),
      );
      expect(
        calls.single.arguments,
        containsPair('clipboardSensitiveFieldHistoryEnabled', true),
      );
      expect(calls.single.arguments, containsPair('voiceEnabled', true));
      expect(
        calls.single.arguments,
        containsPair('mediaVolumeStepPercent', 15),
      );
      expect(
        calls.single.arguments,
        containsPair('mediaBrightnessStepPercent', 20),
      );
      expect(calls.single.arguments, containsPair('keyVibrationIntensity', 3));
      expect(
        calls.single.arguments,
        containsPair('actionRowHeightScale', closeTo(2 / 3, 0.0001)),
      );
      expect(
        calls.single.arguments,
        containsPair('autoCloseModesEnabled', false),
      );
    },
  );

  test(
    'SettingsKeyboardController clears native keyboard diagnostics',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      final calls = <MethodCall>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_keyboardChannel, (call) async {
            calls.add(call);
            return <Object?, Object?>{
              'supported': true,
              'enabled': true,
              'active': true,
              'lastKeyboardError': '',
              'lastKeyboardErrorAt': '',
              'keyboardRecoveryCount': 0,
            };
          });

      final status = await const SettingsKeyboardController()
          .clearDiagnostics();

      expect(calls.single.method, 'clearKeyboardDiagnostics');
      expect(status.keyboardRecoveryCount, 0);
      expect(status.lastKeyboardError, isNull);
      expect(status.lastKeyboardErrorAt, isNull);
    },
  );

  test('AndroidKeyboardStatus parses redacted keyboard diagnostic fields', () {
    final status = AndroidKeyboardStatus.fromMap({
      'supported': true,
      'lastKeyboardError':
          'keyboard_recovered=true; message=token=[REDACTED_SECRET]',
      'lastKeyboardErrorAt': '2026-05-16T08:05:00Z',
      'keyboardRecoveryCount': 3,
    });

    expect(status.lastKeyboardError, contains('[REDACTED_SECRET]'));
    expect(status.lastKeyboardError, isNot(contains('abc123')));
    expect(status.lastKeyboardErrorAt, '2026-05-16T08:05:00Z');
    expect(status.keyboardRecoveryCount, 3);
  });

  test('AndroidKeyboardStatus preserves vibration intensity', () {
    final status = AndroidKeyboardStatus.fromMap({
      'supported': true,
      'keyVibrationEnabled': true,
      'keyVibrationIntensity': 3,
      'keySoundIntensity': 4,
    });

    expect(status.keyVibrationEnabled, isTrue);
    expect(status.keyVibrationIntensity, 3);
    expect(status.keySoundIntensity, 4);
    expect(status.toPreferencesMap()['keyVibrationIntensity'], 3);
    expect(status.toPreferencesMap()['keySoundIntensity'], 4);
  });

  test('AndroidKeyboardStatus parses device profile fields', () {
    final status = AndroidKeyboardStatus.fromMap({
      'supported': true,
      'deviceAndroidSdk': 35,
      'devicePrimaryAbi': 'arm64-v8a',
      'deviceTotalCapacityMb': 24576,
      'deviceFreeSpaceMb': 8192,
      'deviceRamMb': 6144,
    });

    expect(status.deviceAndroidSdk, 35);
    expect(status.devicePrimaryAbi, 'arm64-v8a');
    expect(status.deviceTotalCapacityMb, 24576);
    expect(status.deviceFreeSpaceMb, 8192);
    expect(status.deviceRamMb, 6144);
  });

  test('AndroidKeyboardStatus parses status bar config defaults', () {
    final status = AndroidKeyboardStatus.fromMap({
      'supported': true,
      'statusBarConfig': {
        'mode': 'compact',
        'modules': ['keyboardLabel', 'time'],
        'accountLabelMode': 'visible',
        'tipLevel': 'minimal',
      },
      'accountLabel': 'diane@example.com',
      'accountLabelMode': 'visible',
      'tipsLastResetAtMs': 1715930000000,
    });

    expect(status.statusBarConfig.mode, KeyboardStatusBarMode.compact);
    expect(status.statusBarConfig.modules, [
      KeyboardStatusBarModule.keyboardLabel,
      KeyboardStatusBarModule.time,
    ]);
    expect(
      status.statusBarConfig.accountLabelMode,
      KeyboardStatusBarAccountLabelMode.visible,
    );
    expect(status.statusBarConfig.tipLevel, KeyboardTipLevel.minimal);
    expect(status.accountLabel, 'diane@example.com');
    expect(status.accountLabelMode, KeyboardStatusBarAccountLabelMode.visible);
    expect(status.tipsLastResetAtMs, 1715930000000);
  });

  test(
    'SettingsKeyboardController loads and sets keyboard status bar config',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      final calls = <MethodCall>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_keyboardChannel, (call) async {
            calls.add(call);
            if (call.method == 'setKeyboardStatusBarConfig') {
              return {
                'mode': call.arguments['mode'],
                'modules': call.arguments['modules'],
                'accountLabelMode': call.arguments['accountLabelMode'],
                'tipLevel': call.arguments['tipLevel'],
              };
            }
            if (call.method == 'getKeyboardStatusBarConfig') {
              return {
                'mode': 'hidden',
                'modules': ['keyboardLabel'],
                'accountLabelMode': 'masked',
                'tipLevel': 'off',
              };
            }
            return null;
          });

      final controller = const SettingsKeyboardController();
      final loaded = await controller.loadStatusBarConfig();
      final updated = await controller.setStatusBarConfig(
        KeyboardStatusBarConfig(
          mode: KeyboardStatusBarMode.standard,
          modules: [
            KeyboardStatusBarModule.keyboardLabel,
            KeyboardStatusBarModule.date,
          ],
          accountLabelMode: KeyboardStatusBarAccountLabelMode.visible,
          tipLevel: KeyboardTipLevel.contextual,
        ),
      );

      expect(loaded.mode, KeyboardStatusBarMode.hidden);
      expect(updated.mode, KeyboardStatusBarMode.standard);
      expect(updated.modules, [
        KeyboardStatusBarModule.keyboardLabel,
        KeyboardStatusBarModule.date,
      ]);
      expect(
        calls.any((call) => call.method == 'getKeyboardStatusBarConfig'),
        isTrue,
      );
      expect(
        calls.any((call) => call.method == 'setKeyboardStatusBarConfig'),
        isTrue,
      );
    },
  );

  test(
    'SettingsKeyboardController sends keyboard user context to native channel',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      final calls = <MethodCall>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_keyboardChannel, (call) async {
            calls.add(call);
            return null;
          });

      await const SettingsKeyboardController().setKeyboardUserContext(
        accountLabel: 'd@example.com',
        accountLabelMode: KeyboardStatusBarAccountLabelMode.visible,
        tipsLastResetAtMs: 1715930001111,
      );

      final call = calls.single;
      expect(call.method, 'setKeyboardUserContext');
      expect(call.arguments, containsPair('accountLabel', 'd@example.com'));
      expect(call.arguments, containsPair('accountLabelMode', 'visible'));
      expect(call.arguments, containsPair('tipsLastResetAtMs', 1715930001111));
    },
  );

  test('AndroidKeyboardBridge drains native runtime status events', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, (call) async {
          if (call.method != 'drainKeyboardVoiceRuntimeEvents') {
            return null;
          }
          return <Object?>[
            <Object?, Object?>{
              'runtime_state': 'android_fallback',
              'fallback_reason': 'missing_pack',
              'active_pack_id': 'none',
              'last_error_code': 'none',
              'language_tag': 'fr-FR',
              'engine': 'android_speech_recognizer',
              'source': 'ime_voice_controller',
              'captured_at_epoch_millis': 1715930001111,
            },
          ];
        });

    final events =
        await AndroidKeyboardBridge.drainKeyboardVoiceRuntimeEvents();

    expect(events, hasLength(1));
    expect(events.first.runtimeState, 'android_fallback');
    expect(events.first.fallbackReason, 'missing_pack');
    expect(events.first.activePackId, 'none');
    expect(events.first.lastErrorCode, 'none');
    expect(events.first.languageTag, 'fr-FR');
    expect(events.first.engine, 'android_speech_recognizer');
  });

  test(
    'AndroidKeyboardBridge drains native runtime timeout status event',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_keyboardChannel, (call) async {
            if (call.method != 'drainKeyboardVoiceRuntimeEvents') {
              return null;
            }
            return <Object?>[
              <Object?, Object?>{
                'runtime_state': 'runtime_timeout',
                'fallback_reason': 'runtime_timeout',
                'active_pack_id': 'none',
                'last_error_code': 'speech_error_timeout',
                'language_tag': 'fr-FR',
                'engine': 'android_speech_recognizer',
                'source': 'ime_voice_controller',
                'captured_at_epoch_millis': 1715930003333,
              },
            ];
          });

      final events =
          await AndroidKeyboardBridge.drainKeyboardVoiceRuntimeEvents();

      expect(events, hasLength(1));
      expect(events.first.runtimeState, 'runtime_timeout');
      expect(events.first.fallbackReason, 'runtime_timeout');
      expect(events.first.lastErrorCode, 'speech_error_timeout');
      expect(events.first.activePackId, 'none');
      expect(events.first.languageTag, 'fr-FR');
      expect(events.first.engine, 'android_speech_recognizer');
    },
  );

  test(
    'AndroidKeyboardBridge drains native local timeout status event',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_keyboardChannel, (call) async {
            if (call.method != 'drainKeyboardVoiceRuntimeEvents') {
              return null;
            }
            return <Object?>[
              <Object?, Object?>{
                'runtime_state': 'local_timeout',
                'fallback_reason': 'runtime_timeout',
                'active_pack_id': 'none',
                'last_error_code': 'speech_error_local_timeout',
                'language_tag': 'fr-FR',
                'engine': 'sherpa_onnx',
                'source': 'ime_local_runtime',
                'captured_at_epoch_millis': 1715930004444,
              },
            ];
          });

      final events =
          await AndroidKeyboardBridge.drainKeyboardVoiceRuntimeEvents();

      expect(events, hasLength(1));
      expect(events.first.runtimeState, 'local_timeout');
      expect(events.first.fallbackReason, 'runtime_timeout');
      expect(events.first.lastErrorCode, 'speech_error_local_timeout');
      expect(events.first.source, 'ime_local_runtime');
    },
  );

  test(
    'AndroidKeyboardBridge drains sherpa not linked runtime fallback event',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_keyboardChannel, (call) async {
            if (call.method != 'drainKeyboardVoiceRuntimeEvents') {
              return null;
            }
            return <Object?>[
              <Object?, Object?>{
                'runtime_state': 'android_fallback',
                'fallback_reason': 'runtime_load_failed',
                'active_pack_id': 'none',
                'last_error_code': 'sherpa_engine_not_linked',
                'language_tag': 'fr-FR',
                'engine': 'android_speech_recognizer',
                'source': 'ime_local_runtime',
                'captured_at_epoch_millis': 1715930002222,
              },
            ];
          });

      final events =
          await AndroidKeyboardBridge.drainKeyboardVoiceRuntimeEvents();

      expect(events, hasLength(1));
      expect(events.first.runtimeState, 'android_fallback');
      expect(events.first.fallbackReason, 'runtime_load_failed');
      expect(events.first.lastErrorCode, 'sherpa_engine_not_linked');
      expect(events.first.source, 'ime_local_runtime');
    },
  );

  test('AndroidKeyboardBridge sets native local runtime config', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, (call) async {
          if (call.method != 'setKeyboardVoiceRuntimeConfig') {
            return null;
          }
          return <Object?, Object?>{
            'supported': true,
            'voiceRuntimeMode': 'unavailable',
            'voiceLanguageTag': call.arguments['languageTag'],
            'voicePackId': call.arguments['packId'],
            'voiceEngine': call.arguments['engine'],
            'voiceModelArtifactPath': call.arguments['modelArtifactPath'],
            'voiceFallbackReason': 'missing_pack',
            'voiceLastErrorCode': 'none',
          };
        });

    final status = await AndroidKeyboardBridge.setKeyboardVoiceRuntimeConfig(
      languageTag: 'fr-FR',
      packId: 'sherpa_onnx.fr-fr.whisper_candidate.2026_05_15',
      engine: 'sherpa_onnx',
      modelArtifactPath:
          '/data/user/0/com.commandglows.app/files/asr/fr_fr/model.bundle',
    );

    expect(status.voiceLanguageTag, 'fr-FR');
    expect(
      status.voicePackId,
      'sherpa_onnx.fr-fr.whisper_candidate.2026_05_15',
    );
    expect(status.voiceEngine, 'sherpa_onnx');
  });

  test('AndroidKeyboardBridge pushes model artifact path only', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, (call) async {
          if (call.method != 'setKeyboardVoiceModelArtifact') {
            return null;
          }
          return <Object?, Object?>{
            'supported': true,
            'voiceRuntimeMode': 'unavailable',
            'voiceLanguageTag': call.arguments['languageTag'] ?? 'fr-FR',
            'voicePackId': call.arguments['packId'] ?? 'none',
            'voiceEngine': call.arguments['engine'] ?? 'sherpa_onnx',
            'voiceModelArtifactPath': call.arguments['modelArtifactPath'],
            'voiceFallbackReason': 'missing_pack',
            'voiceLastErrorCode': 'none',
          };
        });

    final status = await AndroidKeyboardBridge.setKeyboardVoiceModelArtifact(
      modelArtifactPath:
          '/data/user/0/com.commandglows.app/files/asr/fr_fr/model.bundle',
      languageTag: 'fr-FR',
      packId: 'sherpa_onnx.fr-fr.whisper_candidate.2026_05_15',
      engine: 'sherpa_onnx',
    );

    expect(status.voiceLanguageTag, 'fr-FR');
    expect(
      status.voicePackId,
      'sherpa_onnx.fr-fr.whisper_candidate.2026_05_15',
    );
  });

  test('AndroidKeyboardBridge probes local runtime path', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, (call) async {
          if (call.method != 'probeKeyboardLocalRuntimePath') {
            return null;
          }
          return <Object?, Object?>{
            'supported': true,
            'voiceRuntimeMode': 'local',
            'voiceLanguageTag': call.arguments['languageTag'],
            'voicePackId': call.arguments['packId'],
            'voiceEngine': call.arguments['engine'],
            'voiceFallbackReason': 'none',
            'voiceLastErrorCode': 'none',
          };
        });

    final status = await AndroidKeyboardBridge.probeKeyboardLocalRuntimePath(
      languageTag: 'fr-FR',
      packId: 'sherpa_onnx.fr-fr.whisper_candidate.2026_05_15',
      engine: 'sherpa_onnx',
      modelArtifactPath:
          '/data/user/0/com.commandglows.app/files/asr/fr_fr/model.bundle',
    );

    expect(status.voiceRuntimeMode, 'local');
    expect(status.voiceFallbackReason, 'none');
  });

  test(
    'AndroidKeyboardBridge surfaces sherpa not linked fallback status',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_keyboardChannel, (call) async {
            if (call.method != 'probeKeyboardLocalRuntimePath') {
              return null;
            }
            return <Object?, Object?>{
              'supported': true,
              'voiceRuntimeMode': 'android_fallback',
              'voiceLanguageTag': call.arguments['languageTag'],
              'voicePackId': 'none',
              'voiceEngine': 'android_speech_recognizer',
              'voiceFallbackReason': 'runtime_load_failed',
              'voiceLastErrorCode': 'sherpa_engine_not_linked',
            };
          });

      final status = await AndroidKeyboardBridge.probeKeyboardLocalRuntimePath(
        languageTag: 'fr-FR',
        packId: 'sherpa_onnx.fr-fr.whisper_candidate.2026_05_15',
        engine: 'sherpa_onnx',
        modelArtifactPath:
            '/data/user/0/com.commandglows.app/files/asr/fr_fr/model.bundle',
      );

      expect(status.voiceRuntimeMode, 'android_fallback');
      expect(status.voiceFallbackReason, 'runtime_load_failed');
      expect(status.voiceLastErrorCode, 'sherpa_engine_not_linked');
    },
  );

  test('AndroidKeyboardBridge surfaces missing model path error', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, (call) async {
          if (call.method != 'probeKeyboardLocalRuntimePath') {
            return null;
          }
          return <Object?, Object?>{
            'supported': true,
            'voiceRuntimeMode': 'android_fallback',
            'voiceLanguageTag': call.arguments['languageTag'],
            'voicePackId': 'none',
            'voiceEngine': 'android_speech_recognizer',
            'voiceFallbackReason': 'runtime_load_failed',
            'voiceLastErrorCode': 'local_model_path_missing',
          };
        });

    final status = await AndroidKeyboardBridge.probeKeyboardLocalRuntimePath(
      languageTag: 'fr-FR',
      packId: 'sherpa_onnx.fr-fr.whisper_candidate.2026_05_15',
      engine: 'sherpa_onnx',
      modelArtifactPath: 'none',
    );

    expect(status.voiceRuntimeMode, 'android_fallback');
    expect(status.voiceLastErrorCode, 'local_model_path_missing');
  });

  test('AndroidKeyboardBridge surfaces invalid model path error', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_keyboardChannel, (call) async {
          if (call.method != 'probeKeyboardLocalRuntimePath') {
            return null;
          }
          return <Object?, Object?>{
            'supported': true,
            'voiceRuntimeMode': 'android_fallback',
            'voiceLanguageTag': call.arguments['languageTag'],
            'voicePackId': 'none',
            'voiceEngine': 'android_speech_recognizer',
            'voiceFallbackReason': 'runtime_load_failed',
            'voiceLastErrorCode': 'local_model_path_invalid',
          };
        });

    final status = await AndroidKeyboardBridge.probeKeyboardLocalRuntimePath(
      languageTag: 'fr-FR',
      packId: 'sherpa_onnx.fr-fr.whisper_candidate.2026_05_15',
      engine: 'sherpa_onnx',
      modelArtifactPath: '../tmp/model.onnx',
    );

    expect(status.voiceRuntimeMode, 'android_fallback');
    expect(status.voiceLastErrorCode, 'local_model_path_invalid');
  });
}

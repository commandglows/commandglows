import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/platform/desktop_control_bridge.dart';

const _channel = MethodChannel('commandglows_app/desktop_control');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_channel, null);
  });

  test('uses the frozen native channel contract and parses status', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.windows;
    final calls = <MethodCall>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_channel, (call) async {
          calls.add(call);
          return {
            'supported': true,
            'enabled': true,
            'active': call.method == 'activate',
            'hotkeyRegistered': true,
            'errorCode': '',
          };
        });

    final status = await DesktopControlBridge.setEnabled(true);
    expect(calls.single.method, 'setEnabled');
    expect(calls.single.arguments, {'enabled': true});
    expect(status.supported, isTrue);
    expect(status.enabled, isTrue);
    expect(status.hotkeyRegistered, isTrue);
    expect(status.errorCode, isNull);
    expect((await DesktopControlBridge.activate()).active, isTrue);
    expect((await DesktopControlBridge.cancel()).active, isFalse);
    expect(calls.map((call) => call.method), [
      'setEnabled',
      'activate',
      'cancel',
    ]);
  });

  test('reports unsupported outside native Windows', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    expect((await DesktopControlBridge.getStatus()).supported, isFalse);
    await expectLater(
      DesktopControlBridge.activate(),
      throwsA(isA<DesktopControlException>()),
    );
  });

  test('maps host errors to actionable French recovery copy', () {
    expect(
      DesktopControlBridge.recoveryMessageFor('HOTKEY_UNAVAILABLE'),
      contains('déjà utilisé'),
    );
    expect(
      DesktopControlBridge.recoveryMessageFor('INPUT_UNAVAILABLE'),
      contains('n’a pas pu envoyer'),
    );
    expect(
      DesktopControlBridge.recoveryMessageFor('unrecognized'),
      contains('relancez CommandGlows'),
    );
  });

  test('translates a native hotkey error into a recovery exception', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.windows;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_channel, (_) async {
          throw PlatformException(code: 'HOTKEY_UNAVAILABLE');
        });

    await expectLater(
      DesktopControlBridge.setEnabled(true),
      throwsA(
        isA<DesktopControlException>()
            .having((error) => error.code, 'code', 'HOTKEY_UNAVAILABLE')
            .having(
              (error) => error.recoveryMessage,
              'recovery message',
              contains('déjà utilisé'),
            ),
      ),
    );
    debugDefaultTargetPlatformOverride = null;
  });
}

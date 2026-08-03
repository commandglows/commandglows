import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_capture_event.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_normalizer.dart';

void main() {
  group('clipboard normalizer', () {
    test('normalizes line endings and extra spacing', () {
      final normalized = normalizeClipboardText('  hello \r\n\r\n  world\t\t ');
      expect(normalized, 'hello \n\n world');
    });

    test('builds stable sha256 hash', () {
      expect(
        sha256Hex('commandglows_app'),
        'fd1753d3ff71c04e9100d53eece3364ee21fabb55460acae8bbab64c1e5ebb80',
      );
    });

    test('flags likely sensitive values', () {
      expect(
        classifySensitiveContent('password: super-secret'),
        ClipboardSensitiveClassification.password,
      );
      expect(
        classifySensitiveContent(
          '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----',
        ),
        ClipboardSensitiveClassification.privateKey,
      );
      expect(
        classifySensitiveContent('OTP code: 123456'),
        ClipboardSensitiveClassification.otp,
      );
      expect(
        classifySensitiveContent('4111 1111 1111 1111'),
        ClipboardSensitiveClassification.creditCard,
      );
      expect(
        classifySensitiveContent('safe plain text'),
        ClipboardSensitiveClassification.none,
      );
    });
  });

  group('clipboard source and dedupe', () {
    test('maps legacy IME source onto current keyboard clipboard source', () {
      final source = ClipboardCanonicalSource.fromDatabase('ime');
      expect(source, ClipboardCanonicalSource.keyboardClipboard);
      expect(source.databaseValue, 'keyboard_clipboard');
    });

    test('builds dedupe key with user/device/source/hash', () {
      final key = buildAutomaticDedupeKey(
        userId: 'user-1',
        deviceId: 'device-1',
        source: ClipboardCanonicalSource.keyboardClipboard,
        normalizedHash: 'abc',
      );
      expect(key, 'user-1|device-1|keyboard_clipboard|abc');
    });

    test('evaluates 10-minute dedupe window correctly', () {
      final now = DateTime.utc(2026, 4, 27, 12, 0);
      expect(
        isWithinAutomaticDedupeWindow(
          existingCapturedAtUtc: now.subtract(const Duration(minutes: 9)),
          incomingCapturedAtUtc: now,
        ),
        isTrue,
      );
      expect(
        isWithinAutomaticDedupeWindow(
          existingCapturedAtUtc: now.subtract(const Duration(minutes: 11)),
          incomingCapturedAtUtc: now,
        ),
        isFalse,
      );
    });

    test('requires confirmation for sensitive clipboard content', () {
      expect(
        () => requireSensitiveClipboardConfirmation(
          content: 'password: super-secret',
          confirmed: false,
        ),
        throwsA(isA<ClipboardSensitiveConfirmationRequiredException>()),
      );
      expect(
        () => requireSensitiveClipboardConfirmation(
          content: 'password: super-secret',
          confirmed: true,
        ),
        returnsNormally,
      );
    });
  });
}

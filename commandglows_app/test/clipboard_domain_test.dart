import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_capture_event.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_normalizer.dart';

void main() {
  group('clipboard normalizer', () {
    test('normalizes line endings and extra spacing', () {
      final normalized = normalizeClipboardText('  hello \r\n\r\n  world\t\t ');
      expect(normalized, 'hello \n\n world');
    });

    test('builds the canonical UTF-8 sha256 digest', () {
      expect(
        sha256Hex('abc'),
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      );
    });

    test('keeps persisted normalized clipboard hashes stable', () {
      final persistedHash = sha256Hex(normalizeClipboardText('hello world'));

      expect(
        persistedHash,
        'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
      );
      expect(
        sha256Hex(normalizeClipboardText('  hello   world\t')),
        persistedHash,
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

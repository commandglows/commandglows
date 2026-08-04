import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/data/supabase/clipboard_repository.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_capture_event.dart';

void main() {
  group('SupabaseClipboardStore payload adapter', () {
    test(
      'includes local dedupe metadata using backend-agnostic source model',
      () {
        final payload = SupabaseClipboardStore.buildInsertPayload(
          content: ' hello   world ',
          source: ClipboardCanonicalSource.keyboardClipboard,
          originDeviceId: 'android:test-device',
          syncState: ClipboardSyncState.pending,
          capturedAtUtc: DateTime.utc(2026, 5, 8, 12, 0),
        );

        expect(payload['source'], 'keyboard_clipboard');
        expect(payload['origin_surface'], 'keyboard');
        expect(payload['capture_method'], 'keyboard_clipboard');
        expect(payload['origin_device_id'], 'android:test-device');
        expect(payload['content_hash'], isA<String>());
        expect(payload['normalized_hash'], isA<String>());
        expect(payload['capture_count'], 1);
        expect(payload['source_metadata'], containsPair('capture_count', 1));
      },
    );

    test('requires explicit confirmation for sensitive payloads', () {
      expect(
        () => SupabaseClipboardStore.buildInsertPayload(
          content: 'password: super-secret',
          source: ClipboardCanonicalSource.manual,
        ),
        throwsA(isA<ClipboardSensitiveConfirmationRequiredException>()),
      );

      final payload = SupabaseClipboardStore.buildInsertPayload(
        content: 'password: super-secret',
        source: ClipboardCanonicalSource.manual,
        sensitiveConfirmed: true,
      );
      expect(payload['source'], 'manual');
    });
  });
}

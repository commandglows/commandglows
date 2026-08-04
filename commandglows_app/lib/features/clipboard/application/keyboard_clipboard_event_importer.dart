import '../../../core/platform/android_keyboard_bridge.dart';
import '../domain/clipboard_capture_event.dart';
import 'clipboard_history_api.dart';

class KeyboardClipboardEventImportResult {
  const KeyboardClipboardEventImportResult({
    required this.imported,
    required this.rejectedSensitive,
    required this.failed,
  });

  final int imported;
  final int rejectedSensitive;
  final int failed;

  bool get hasWork => imported > 0 || rejectedSensitive > 0 || failed > 0;
}

class KeyboardClipboardEventImporter {
  KeyboardClipboardEventImporter(
    this._api, {
    Future<List<AndroidKeyboardClipboardEvent>> Function()? drainEvents,
  }) : _drainEvents =
           drainEvents ?? AndroidKeyboardBridge.drainKeyboardClipboardEvents;

  final ClipboardHistoryApi _api;
  final Future<List<AndroidKeyboardClipboardEvent>> Function() _drainEvents;

  Future<KeyboardClipboardEventImportResult> drainFromAndroidKeyboard() async {
    final events = await _drainEvents();
    var imported = 0;
    var rejectedSensitive = 0;
    var failed = 0;
    for (final event in events) {
      try {
        await _api.captureAutomaticItem(
          content: event.content,
          source: event.source,
          deviceId: event.deviceId,
          capturedAtUtc: event.capturedAtUtc,
          syncState: ClipboardSyncState.pending,
          sourceMetadata: event.sourceMetadata,
        );
        imported += 1;
      } on ClipboardSensitiveConfirmationRequiredException {
        rejectedSensitive += 1;
      } catch (_) {
        failed += 1;
      }
    }
    return KeyboardClipboardEventImportResult(
      imported: imported,
      rejectedSensitive: rejectedSensitive,
      failed: failed,
    );
  }
}

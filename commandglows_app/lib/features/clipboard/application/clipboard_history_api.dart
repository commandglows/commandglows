import '../domain/clipboard_capture_event.dart';
import '../domain/clipboard_store.dart';

class ClipboardHistoryApi {
  const ClipboardHistoryApi(this._store);

  final ClipboardHistoryStore _store;

  Future<List<ClipboardItemRecord>> listItems() {
    return _store.list();
  }

  Future<void> addManualItem({
    required String content,
    required ClipboardCanonicalSource source,
    bool sensitiveConfirmed = false,
  }) {
    return _store.insert(
      content: content,
      source: source,
      syncState: ClipboardSyncState.synced,
      sensitiveConfirmed: sensitiveConfirmed,
    );
  }

  Future<ClipboardItemRecord> captureAutomaticItem({
    required String content,
    required ClipboardCanonicalSource source,
    required String deviceId,
    required DateTime capturedAtUtc,
    ClipboardSyncState syncState = ClipboardSyncState.pending,
    Map<String, Object?> sourceMetadata = const <String, Object?>{},
    bool sensitiveConfirmed = false,
  }) {
    return _store.upsertAutomaticWithinWindow(
      ClipboardAutomaticUpsertDraft(
        content: content,
        source: source,
        deviceId: deviceId,
        capturedAtUtc: capturedAtUtc,
        syncState: syncState,
        sourceMetadata: sourceMetadata,
        sensitiveConfirmed: sensitiveConfirmed,
      ),
    );
  }

  Future<void> updateItemContent({
    required String id,
    required String content,
    bool sensitiveConfirmed = false,
  }) {
    return _store.updateContent(
      id: id,
      content: content,
      sensitiveConfirmed: sensitiveConfirmed,
    );
  }

  Future<void> markItemSyncState({
    required String id,
    required ClipboardSyncState state,
    String? syncError,
  }) {
    return _store.markSyncState(id: id, state: state, syncError: syncError);
  }

  Future<void> setPinned({required String id, required bool pinned}) {
    return _store.togglePin(id: id, pinned: pinned);
  }

  Future<void> removeItem(String id) {
    return _store.softDelete(id);
  }
}

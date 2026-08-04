import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/platform_capabilities.dart';
import '../../../core/sync/cloud_sync_overview.dart';
import '../../auth/application/auth_session_provider.dart';
import '../../auth/application/suite_identity_provider.dart';
import '../../clipboard/application/clipboard_store_provider.dart';
import '../../clipboard/data/firebase_clipboard_history_store.dart';
import '../../dictionary/application/dictionary_store_provider.dart';
import '../../dictionary/data/firebase_dictionary_store.dart';
import '../../keyboard/application/keyboard_sync_controller.dart';
import '../../keyboard/application/keyboard_sync_providers.dart';
import '../../sync/application/local_cloud_sync_provider.dart';
import '../../snippets/application/snippet_store_provider.dart';
import '../../snippets/data/firebase_snippet_store.dart';
import '../../voice/application/transcription_store_provider.dart';
import '../../voice/data/firebase_transcription_store.dart';
import '../application/settings_store_provider.dart';
import '../data/firebase_settings_store.dart';

final cloudSyncOverviewProvider = Provider<CloudSyncOverview>((ref) {
  final authAsync = ref.watch(authSessionProvider);
  final suiteIdentityAsync = ref.watch(suiteIdentityProvider);
  final remoteAuthConfigured = ref.watch(remoteAuthConfiguredProvider);
  final keyboardProviderState = _keyboardSyncControllerState(ref);
  final keyboardControllerState = keyboardProviderState.$1;
  final keyboardRemoteSyncActive = keyboardProviderState.$2;
  final localCloudSyncState = ref.watch(localCloudSyncStateProvider);

  final remoteSettingsStore = ref.watch(settingsStoreProvider);
  final remoteClipboardStore = ref.watch(clipboardStoreProvider);
  final remoteSnippetStore = ref.watch(snippetStoreProvider);
  final remoteDictionaryStore = ref.watch(dictionaryStoreProvider);
  final remoteTranscriptionStore = ref.watch(transcriptionStoreProvider);

  return buildCloudSyncOverview(
    remoteAuthConfigured: remoteAuthConfigured,
    authLoading: authAsync.isLoading,
    authSession: authAsync.maybeWhen(
      data: (value) => value,
      orElse: () => null,
    ),
    authError: _extractAsyncError(authAsync),
    suiteLoading: suiteIdentityAsync.isLoading,
    suiteIdentity: suiteIdentityAsync.maybeWhen(
      data: (value) => value,
      orElse: () => null,
    ),
    suiteError: _extractAsyncError(suiteIdentityAsync),
    keyboardImeSupported: PlatformCapabilities.keyboardImeSupported,
    keyboardRemoteSyncActive: keyboardRemoteSyncActive,
    keyboardControllerState: keyboardControllerState,
    localCloudSyncState: localCloudSyncState,
    settingsStoreRemoteActive: remoteSettingsStore is FirebaseSettingsStore,
    clipboardStoreRemoteActive:
        remoteClipboardStore is FirebaseClipboardHistoryStore,
    snippetStoreRemoteActive: remoteSnippetStore is FirebaseSnippetStore,
    dictionaryStoreRemoteActive:
        remoteDictionaryStore is FirebaseDictionaryStore,
    transcriptionStoreRemoteActive:
        remoteTranscriptionStore is FirebaseTranscriptionStore,
  );
});

String? _extractAsyncError(AsyncValue<Object?> asyncValue) {
  return asyncValue.whenOrNull(error: (error, _) => error.toString());
}

/// Reads keyboard sync controller state defensively to avoid failing settings
/// rendering when remote keyboard sync infrastructure is not available.
///
/// In tests or unusual runtime environments (e.g. missing Firebase app),
/// the keyboard sync controller provider can fail to initialize.
(KeyboardSyncControllerState, bool) _keyboardSyncControllerState(Ref ref) {
  try {
    final controllerState = ref.watch(keyboardSyncControllerStateProvider);
    final authContext = ref.watch(keyboardSyncAuthContextProvider);
    return (controllerState, authContext.remoteSyncActive);
  } catch (_) {
    final authContext = ref.watch(keyboardSyncAuthContextProvider);
    return (
      const KeyboardSyncControllerState.initial(),
      authContext.remoteSyncActive,
    );
  }
}

import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/bootstrap/firebase_bootstrap.dart';
import '../../auth/application/auth_session_provider.dart';
import '../../auth/application/suite_identity_provider.dart';
import '../../auth/domain/product_entitlement.dart';
import '../../clipboard/application/clipboard_store_provider.dart';
import '../../clipboard/data/firebase_clipboard_history_store.dart';
import '../../dictionary/application/dictionary_store_provider.dart';
import '../../dictionary/data/firebase_dictionary_store.dart';
import '../../settings/application/settings_store_provider.dart';
import '../../settings/data/firebase_settings_store.dart';
import '../../snippets/application/snippet_store_provider.dart';
import '../../snippets/data/firebase_snippet_store.dart';
import '../../voice/application/transcription_store_provider.dart';
import '../../voice/data/firebase_transcription_store.dart';
import '../data/local_cloud_sync_metadata_store.dart';
import 'local_cloud_sync_adapters.dart';
import 'local_cloud_sync_controller.dart';
import '../domain/local_cloud_sync_models.dart';

final localCloudSyncMetadataStoreProvider =
    Provider<LocalCloudSyncMetadataStore>(
      (ref) => LocalCloudSyncMetadataStore(),
    );

final localCloudSyncAuthContextProvider = Provider<LocalCloudSyncAuthContext>((
  ref,
) {
  final session = ref.watch(
    authSessionProvider.select(
      (value) =>
          value.maybeWhen(data: (session) => session, orElse: () => null),
    ),
  );
  final suiteIdentity = ref
      .watch(suiteIdentityProvider)
      .maybeWhen(data: (identity) => identity, orElse: () => null);
  final firebaseUid = firebase_auth.FirebaseAuth.instance.currentUser?.uid;

  return LocalCloudSyncAuthContext(
    isSignedIn: session?.isSignedIn ?? false,
    isLocalFallback: session?.isLocalFallback ?? true,
    hasEntitlement: suiteIdentity?.hasAccessTo(ProductId.commandglowsApp) ?? false,
    firebaseUid: firebaseUid,
    globalUserId: suiteIdentity?.globalUserId,
  );
});

final localCloudSyncControllerProvider = Provider<LocalCloudSyncController>((
  ref,
) {
  final adapters = <LocalCloudSyncControllerAdapterBridge>[];

  if (FirebaseBootstrap.isConfigured) {
    adapters.addAll([
      LocalCloudSyncControllerAdapterBridge(
        ClipboardSyncAdapter(
          localStore: ref.watch(localClipboardHistoryStoreProvider),
          cloudStore: FirebaseClipboardHistoryStore(),
        ),
      ),
      LocalCloudSyncControllerAdapterBridge(
        SnippetSyncAdapter(
          localStore: ref.watch(localSnippetStoreProvider),
          cloudStore: FirebaseSnippetStore(),
        ),
      ),
      LocalCloudSyncControllerAdapterBridge(
        DictionarySyncAdapter(
          localStore: ref.watch(localDictionaryStoreProvider),
          cloudStore: FirebaseDictionaryStore(),
        ),
      ),
      LocalCloudSyncControllerAdapterBridge(
        SettingsSyncAdapter(
          localStore: ref.watch(localSettingsStoreProvider),
          cloudStore: FirebaseSettingsStore(),
        ),
      ),
      LocalCloudSyncControllerAdapterBridge(
        VoiceSyncAdapter(
          localStore: ref.watch(localTranscriptionStoreProvider),
          cloudStore: FirebaseTranscriptionStore(),
        ),
      ),
    ]);
  }

  return LocalCloudSyncController(
    adapters: adapters,
    metadataStore: ref.watch(localCloudSyncMetadataStoreProvider),
  );
});

class LocalCloudSyncStateNotifier extends Notifier<LocalCloudSyncState> {
  String? _lastAccountKey;

  @override
  LocalCloudSyncState build() {
    return ref.watch(localCloudSyncControllerProvider).state;
  }

  Future<void> synchronizeIfNeeded() async {
    final context = ref.read(localCloudSyncAuthContextProvider);
    final accountKey =
        '${context.firebaseUid ?? 'none'}|${context.globalUserId ?? 'none'}|${context.remoteSyncActive}';
    if (accountKey == _lastAccountKey &&
        state.status == LocalCloudSyncControllerStatus.ready) {
      return;
    }
    _lastAccountKey = accountKey;
    state = await ref
        .read(localCloudSyncControllerProvider)
        .synchronize(context);
  }

  Future<void> forceSynchronize() async {
    _lastAccountKey = null;
    await synchronizeIfNeeded();
  }
}

final localCloudSyncStateProvider =
    NotifierProvider<LocalCloudSyncStateNotifier, LocalCloudSyncState>(
      LocalCloudSyncStateNotifier.new,
    );

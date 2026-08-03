import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/features/auth/application/auth_session_provider.dart';
import 'package:commandglows_app/features/auth/application/suite_identity_provider.dart';
import 'package:commandglows_app/features/auth/domain/auth_session_store.dart';
import 'package:commandglows_app/features/auth/domain/suite_identity.dart';
import 'package:commandglows_app/features/clipboard/application/clipboard_store_provider.dart';
import 'package:commandglows_app/features/clipboard/data/persistent_clipboard_history_store.dart';
import 'package:commandglows_app/features/dictionary/application/dictionary_store_provider.dart';
import 'package:commandglows_app/features/dictionary/data/in_memory_dictionary_store.dart';
import 'package:commandglows_app/features/settings/application/settings_store_provider.dart';
import 'package:commandglows_app/features/settings/data/local_settings_store.dart';
import 'package:commandglows_app/features/snippets/application/snippet_store_provider.dart';
import 'package:commandglows_app/features/snippets/data/in_memory_snippet_store.dart';
import 'package:commandglows_app/features/voice/application/transcription_store_provider.dart';
import 'package:commandglows_app/features/voice/data/in_memory_transcription_store.dart';

void main() {
  test('local mode keeps every product store on local implementations', () {
    final container = ProviderContainer(
      overrides: [
        authSessionProvider.overrideWith(
          (ref) => Stream.value(const AuthSessionSnapshot.localFallback()),
        ),
      ],
    );
    addTearDown(container.dispose);

    expect(
      container.read(transcriptionStoreProvider),
      isA<InMemoryTranscriptionStore>(),
    );
    expect(
      container.read(clipboardStoreProvider),
      isA<PersistentClipboardHistoryStore>(),
    );
    expect(container.read(snippetStoreProvider), isA<InMemorySnippetStore>());
    expect(
      container.read(dictionaryStoreProvider),
      isA<InMemoryDictionaryStore>(),
    );
    expect(container.read(settingsStoreProvider), isA<LocalSettingsStore>());
  });

  test(
    'remote session without suite entitlement keeps product stores local',
    () {
      const remoteSession = AuthSessionSnapshot(
        user: AuthUserSnapshot(
          id: 'firebase-user-1',
          provider: AuthProviderKind.emailPassword,
        ),
        syncStatus: SyncStatus(health: SyncHealth.synced),
      );
      final container = ProviderContainer(
        overrides: [
          authSessionProvider.overrideWith(
            (ref) => Stream.value(remoteSession),
          ),
          suiteIdentityProvider.overrideWith(
            (ref) => Stream.value(
              const SuiteIdentitySnapshot(
                status: SuiteAccountStatus.accessInactive,
                globalUserId: 'gu_1',
              ),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      expect(
        container.read(transcriptionStoreProvider),
        isA<InMemoryTranscriptionStore>(),
      );
      expect(
        container.read(clipboardStoreProvider),
        isA<PersistentClipboardHistoryStore>(),
      );
      expect(container.read(snippetStoreProvider), isA<InMemorySnippetStore>());
      expect(
        container.read(dictionaryStoreProvider),
        isA<InMemoryDictionaryStore>(),
      );
      expect(container.read(settingsStoreProvider), isA<LocalSettingsStore>());
    },
  );
}

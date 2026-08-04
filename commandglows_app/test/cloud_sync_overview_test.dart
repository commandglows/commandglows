import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/sync/cloud_sync_overview.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/features/auth/domain/auth_session_store.dart';
import 'package:commandglows_app/features/auth/domain/product_entitlement.dart';
import 'package:commandglows_app/features/auth/domain/suite_identity.dart';
import 'package:commandglows_app/features/keyboard/application/keyboard_sync_controller.dart';
import 'package:commandglows_app/features/sync/domain/local_cloud_sync_models.dart';

void main() {
  const signedInSession = AuthSessionSnapshot(
    user: AuthUserSnapshot(
      id: 'user-123',
      provider: AuthProviderKind.emailPassword,
      email: 'alice@example.test',
    ),
    syncStatus: SyncStatus(health: SyncHealth.synced),
  );

  const localFallbackSession = AuthSessionSnapshot.localFallback();

  const activeSuite = SuiteIdentitySnapshot(
    status: SuiteAccountStatus.accessActive,
    globalUserId: 'global-user',
    entitlements: [
      ProductEntitlement(
        productId: ProductId.commandglowsApp,
        status: ProductEntitlementStatus.active,
      ),
    ],
  );

  const inactiveSuite = SuiteIdentitySnapshot(
    status: SuiteAccountStatus.accessInactive,
    globalUserId: 'global-user',
  );

  const syncEnabledReadyKeyboard = KeyboardSyncControllerState(
    status: KeyboardSyncControllerStatus.ready,
    decision: KeyboardSyncDecisionKind.restoreLocalFromCloud,
    hasPendingQueue: false,
  );

  const syncFailedKeyboard = KeyboardSyncControllerState(
    status: KeyboardSyncControllerStatus.failed,
    decision: KeyboardSyncDecisionKind.conflict,
    hasPendingQueue: false,
    issueMessage: 'issue code',
  );

  test('remote-auth must be active for account sync state to unlock', () {
    final overview = buildCloudSyncOverview(
      remoteAuthConfigured: false,
      authLoading: false,
      suiteLoading: false,
      authSession: signedInSession,
      suiteIdentity: activeSuite,
      authError: null,
      suiteError: null,
      keyboardImeSupported: false,
      keyboardRemoteSyncActive: false,
      keyboardControllerState: const KeyboardSyncControllerState.initial(),
      localCloudSyncState: LocalCloudSyncState.initial(),
      settingsStoreRemoteActive: true,
      clipboardStoreRemoteActive: true,
      snippetStoreRemoteActive: true,
      dictionaryStoreRemoteActive: true,
      transcriptionStoreRemoteActive: true,
    );

    expect(overview.isRemoteAuthConfigured, isFalse);
    expect(overview.isRemoteSignedIn, isFalse);
    expect(overview.hasSuiteAccess, isFalse);
    expect(
      overview.categories
          .where(
            (status) => [
              CloudSyncCategory.settings,
              CloudSyncCategory.clipboard,
              CloudSyncCategory.snippets,
              CloudSyncCategory.dictionary,
              CloudSyncCategory.transcriptions,
            ].contains(status.category),
          )
          .every(
            (status) => status.state == CloudSyncCategoryState.unavailable,
          ),
      isTrue,
    );
  });

  test('active auth without entitlement keeps data categories local-only', () {
    final overview = buildCloudSyncOverview(
      remoteAuthConfigured: true,
      authLoading: false,
      suiteLoading: false,
      authSession: signedInSession,
      suiteIdentity: inactiveSuite,
      authError: null,
      suiteError: null,
      keyboardImeSupported: true,
      keyboardRemoteSyncActive: false,
      keyboardControllerState: const KeyboardSyncControllerState.initial(),
      localCloudSyncState: LocalCloudSyncState.initial(),
      settingsStoreRemoteActive: true,
      clipboardStoreRemoteActive: true,
      snippetStoreRemoteActive: true,
      dictionaryStoreRemoteActive: true,
      transcriptionStoreRemoteActive: true,
    );

    expect(overview.hasSuiteAccess, isFalse);
    expect(
      overview.categories
          .where(
            (status) => [
              CloudSyncCategory.settings,
              CloudSyncCategory.clipboard,
              CloudSyncCategory.snippets,
              CloudSyncCategory.dictionary,
              CloudSyncCategory.transcriptions,
            ].contains(status.category),
          )
          .every((status) => status.state == CloudSyncCategoryState.localOnly),
      isTrue,
    );
  });

  test('data categories never report synced without explicit evidence', () {
    final overview = buildCloudSyncOverview(
      remoteAuthConfigured: true,
      authLoading: false,
      suiteLoading: false,
      authSession: signedInSession,
      suiteIdentity: activeSuite,
      authError: null,
      suiteError: null,
      keyboardImeSupported: true,
      keyboardRemoteSyncActive: true,
      keyboardControllerState: syncEnabledReadyKeyboard,
      localCloudSyncState: LocalCloudSyncState.initial(),
      settingsStoreRemoteActive: true,
      clipboardStoreRemoteActive: true,
      snippetStoreRemoteActive: true,
      dictionaryStoreRemoteActive: true,
      transcriptionStoreRemoteActive: true,
    );

    const syncableCategories = {
      CloudSyncCategory.settings,
      CloudSyncCategory.clipboard,
      CloudSyncCategory.snippets,
      CloudSyncCategory.dictionary,
      CloudSyncCategory.transcriptions,
    };

    for (final status in overview.categories) {
      if (syncableCategories.contains(status.category)) {
        expect(
          status.state,
          isNot(
            anyOf(
              equals(CloudSyncCategoryState.synced),
              equals(CloudSyncCategoryState.syncing),
              equals(CloudSyncCategoryState.pending),
            ),
          ),
          reason:
              '${status.title} must not be reported synced/pending/syncing without explicit proof.',
        );
      }
    }
  });

  test('keyboard category reflects platform availability', () {
    final webOverview = buildCloudSyncOverview(
      remoteAuthConfigured: true,
      authLoading: false,
      suiteLoading: false,
      authSession: signedInSession,
      suiteIdentity: activeSuite,
      authError: null,
      suiteError: null,
      keyboardImeSupported: false,
      keyboardRemoteSyncActive: true,
      keyboardControllerState: syncEnabledReadyKeyboard,
      localCloudSyncState: LocalCloudSyncState.initial(),
      settingsStoreRemoteActive: true,
      clipboardStoreRemoteActive: true,
      snippetStoreRemoteActive: true,
      dictionaryStoreRemoteActive: true,
      transcriptionStoreRemoteActive: true,
    );

    final keyboardCategory = webOverview.categories.firstWhere(
      (status) => status.category == CloudSyncCategory.keyboardProfile,
    );
    expect(
      keyboardCategory.state,
      equals(CloudSyncCategoryState.platformUnavailable),
    );
  });

  test('keyboard failure stays in attention-required state', () {
    final overview = buildCloudSyncOverview(
      remoteAuthConfigured: true,
      authLoading: false,
      suiteLoading: false,
      authSession: signedInSession,
      suiteIdentity: activeSuite,
      authError: null,
      suiteError: null,
      keyboardImeSupported: true,
      keyboardRemoteSyncActive: true,
      keyboardControllerState: syncFailedKeyboard,
      localCloudSyncState: LocalCloudSyncState.initial(),
      settingsStoreRemoteActive: true,
      clipboardStoreRemoteActive: true,
      snippetStoreRemoteActive: true,
      dictionaryStoreRemoteActive: true,
      transcriptionStoreRemoteActive: true,
    );

    final keyboardCategory = overview.categories.firstWhere(
      (status) => status.category == CloudSyncCategory.keyboardProfile,
    );

    expect(keyboardCategory.state, equals(CloudSyncCategoryState.failed));
    expect(overview.requiresAttention, isTrue);
  });

  test('signed-in but local fallback never creates remote-signed-in state', () {
    final overview = buildCloudSyncOverview(
      remoteAuthConfigured: true,
      authLoading: false,
      suiteLoading: false,
      authSession: localFallbackSession,
      suiteIdentity: activeSuite,
      authError: null,
      suiteError: null,
      keyboardImeSupported: true,
      keyboardRemoteSyncActive: false,
      keyboardControllerState: const KeyboardSyncControllerState.initial(),
      localCloudSyncState: LocalCloudSyncState.initial(),
      settingsStoreRemoteActive: false,
      clipboardStoreRemoteActive: false,
      snippetStoreRemoteActive: false,
      dictionaryStoreRemoteActive: false,
      transcriptionStoreRemoteActive: false,
    );

    expect(overview.isRemoteSignedIn, isFalse);
    expect(
      overview.categories.any(
        (status) =>
            status.category == CloudSyncCategory.account &&
            status.state == CloudSyncCategoryState.localOnly,
      ),
      isTrue,
    );
    expect(overview.remoteCategories, isEmpty);
  });
}

import 'package:flutter/material.dart';

import '../../features/auth/domain/auth_session_store.dart';
import '../../features/auth/domain/product_entitlement.dart';
import '../../features/auth/domain/suite_identity.dart';
import '../../features/keyboard/application/keyboard_sync_controller.dart';
import '../../features/sync/domain/local_cloud_sync_models.dart';

enum CloudSyncCategory {
  account,
  suiteAccess,
  settings,
  clipboard,
  snippets,
  dictionary,
  transcriptions,
  keyboardProfile,
  localKeys,
}

enum CloudSyncCategoryState {
  unavailable,
  localOnly,
  platformUnavailable,
  notMeasured,
  checking,
  syncing,
  pending,
  synced,
  failed,
  conflict,
}

class CloudSyncCategoryStatus {
  const CloudSyncCategoryStatus({
    required this.category,
    required this.title,
    required this.state,
    required this.stateLabel,
    required this.detail,
  });

  final CloudSyncCategory category;
  final String title;
  final CloudSyncCategoryState state;
  final String stateLabel;
  final String detail;

  bool get isRemoteVisible =>
      state == CloudSyncCategoryState.synced ||
      state == CloudSyncCategoryState.syncing ||
      state == CloudSyncCategoryState.pending;

  bool get requiresAttention =>
      state == CloudSyncCategoryState.failed ||
      state == CloudSyncCategoryState.conflict;

  bool get isUnavailable =>
      state == CloudSyncCategoryState.unavailable ||
      state == CloudSyncCategoryState.platformUnavailable ||
      state == CloudSyncCategoryState.notMeasured;

  IconData get icon => switch (state) {
    CloudSyncCategoryState.unavailable => Icons.cloud_off_outlined,
    CloudSyncCategoryState.localOnly => Icons.cloud_off_outlined,
    CloudSyncCategoryState.platformUnavailable => Icons.devices_other_outlined,
    CloudSyncCategoryState.notMeasured => Icons.visibility_off_outlined,
    CloudSyncCategoryState.checking => Icons.cloud_sync_outlined,
    CloudSyncCategoryState.syncing => Icons.sync,
    CloudSyncCategoryState.pending => Icons.schedule,
    CloudSyncCategoryState.synced => Icons.cloud_done_outlined,
    CloudSyncCategoryState.failed => Icons.error_outline,
    CloudSyncCategoryState.conflict => Icons.warning_amber_outlined,
  };
}

class CloudSyncOverview {
  const CloudSyncOverview({
    required this.categories,
    required this.isRemoteAuthConfigured,
    required this.isRemoteSignedIn,
    required this.hasSuiteAccess,
    required this.keyboardImeSupported,
  });

  final List<CloudSyncCategoryStatus> categories;
  final bool isRemoteAuthConfigured;
  final bool isRemoteSignedIn;
  final bool hasSuiteAccess;
  final bool keyboardImeSupported;

  List<CloudSyncCategoryStatus> get remoteCategories => categories
      .where((status) => status.isRemoteVisible)
      .toList(growable: false);

  List<CloudSyncCategoryStatus> get localOnlyCategories => categories
      .where((status) => status.isUnavailable)
      .toList(growable: false);

  bool get requiresAttention =>
      categories.any((status) => status.requiresAttention);
}

CloudSyncOverview buildCloudSyncOverview({
  required bool remoteAuthConfigured,
  required bool authLoading,
  required bool suiteLoading,
  required AuthSessionSnapshot? authSession,
  required SuiteIdentitySnapshot? suiteIdentity,
  required String? authError,
  required String? suiteError,
  required bool keyboardImeSupported,
  required bool keyboardRemoteSyncActive,
  required KeyboardSyncControllerState keyboardControllerState,
  required LocalCloudSyncState localCloudSyncState,
  required bool settingsStoreRemoteActive,
  required bool clipboardStoreRemoteActive,
  required bool snippetStoreRemoteActive,
  required bool dictionaryStoreRemoteActive,
  required bool transcriptionStoreRemoteActive,
}) {
  final accountStatus = _accountStatus(
    remoteAuthConfigured: remoteAuthConfigured,
    authLoading: authLoading,
    authSession: authSession,
    error: authError,
  );

  final suiteAccessStatus = _suiteAccessStatus(
    remoteAuthConfigured: remoteAuthConfigured,
    authLoading: authLoading,
    suiteLoading: suiteLoading,
    authSession: authSession,
    suiteIdentity: suiteIdentity,
    authError: authError,
    suiteError: suiteError,
  );

  final hasRemoteAuth =
      accountStatus.state == CloudSyncCategoryState.synced ||
      accountStatus.state == CloudSyncCategoryState.checking;
  final hasSuiteAccess =
      suiteAccessStatus.state == CloudSyncCategoryState.synced;

  final keyboardStatus = _keyboardStatus(
    remoteAuthConfigured: remoteAuthConfigured,
    keyboardImeSupported: keyboardImeSupported,
    authSession: authSession,
    authError: authError,
    suiteIdentity: suiteIdentity,
    suiteError: suiteError,
    keyboardRemoteSyncActive: keyboardRemoteSyncActive,
    keyboardControllerState: keyboardControllerState,
  );

  return CloudSyncOverview(
    isRemoteAuthConfigured: remoteAuthConfigured,
    isRemoteSignedIn: hasRemoteAuth,
    hasSuiteAccess: hasSuiteAccess,
    keyboardImeSupported: keyboardImeSupported,
    categories: [
      accountStatus,
      suiteAccessStatus,
      _dataCategoryStatus(
        title: 'Apparence & paramètres',
        category: CloudSyncCategory.settings,
        remoteEnabled: settingsStoreRemoteActive,
        localCloudDomainStatus:
            localCloudSyncState.domains[LocalCloudSyncDomain.settings],
        remoteAuthConfigured: remoteAuthConfigured,
        authSession: authSession,
        authError: authError,
        suiteIdentity: suiteIdentity,
        suiteError: suiteError,
        hasSuiteAccess: hasSuiteAccess,
      ),
      _dataCategoryStatus(
        title: 'Clipboard',
        category: CloudSyncCategory.clipboard,
        remoteEnabled: clipboardStoreRemoteActive,
        localCloudDomainStatus: null,
        remoteAuthConfigured: remoteAuthConfigured,
        authSession: authSession,
        authError: authError,
        suiteIdentity: suiteIdentity,
        suiteError: suiteError,
        hasSuiteAccess: hasSuiteAccess,
      ),
      _dataCategoryStatus(
        title: 'Snippets',
        category: CloudSyncCategory.snippets,
        remoteEnabled: snippetStoreRemoteActive,
        localCloudDomainStatus: null,
        remoteAuthConfigured: remoteAuthConfigured,
        authSession: authSession,
        authError: authError,
        suiteIdentity: suiteIdentity,
        suiteError: suiteError,
        hasSuiteAccess: hasSuiteAccess,
      ),
      _dataCategoryStatus(
        title: 'Dictionnaire',
        category: CloudSyncCategory.dictionary,
        remoteEnabled: dictionaryStoreRemoteActive,
        localCloudDomainStatus: null,
        remoteAuthConfigured: remoteAuthConfigured,
        authSession: authSession,
        authError: authError,
        suiteIdentity: suiteIdentity,
        suiteError: suiteError,
        hasSuiteAccess: hasSuiteAccess,
      ),
      _dataCategoryStatus(
        title: 'Transcriptions',
        category: CloudSyncCategory.transcriptions,
        remoteEnabled: transcriptionStoreRemoteActive,
        localCloudDomainStatus: null,
        remoteAuthConfigured: remoteAuthConfigured,
        authSession: authSession,
        authError: authError,
        suiteIdentity: suiteIdentity,
        suiteError: suiteError,
        hasSuiteAccess: hasSuiteAccess,
      ),
      _keyboardCategoryStatus(
        keyboardImeSupported: keyboardImeSupported,
        keyboardStatus: keyboardStatus,
      ),
      const CloudSyncCategoryStatus(
        category: CloudSyncCategory.localKeys,
        title: 'Clés IA locales',
        state: CloudSyncCategoryState.localOnly,
        stateLabel: 'Local uniquement',
        detail:
            'Toujours locales : OpenAI et Anthropic sont stockées sur cet appareil.',
      ),
    ],
  );
}

CloudSyncCategoryStatus _accountStatus({
  required bool remoteAuthConfigured,
  required bool authLoading,
  required AuthSessionSnapshot? authSession,
  required String? error,
}) {
  if (!remoteAuthConfigured) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.account,
      title: 'Compte CommandGlows',
      state: CloudSyncCategoryState.unavailable,
      stateLabel: 'Cloud désactivé',
      detail:
          'L’authentification distante n’est pas activée dans cette version.',
    );
  }
  if (error != null) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.account,
      title: 'Compte CommandGlows',
      state: CloudSyncCategoryState.unavailable,
      stateLabel: 'Compte indisponible',
      detail:
          'Le statut du compte cloud est indisponible pour l’instant. Réessaie.',
    );
  }
  if (authLoading || authSession == null) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.account,
      title: 'Compte CommandGlows',
      state: CloudSyncCategoryState.checking,
      stateLabel: 'Vérification',
      detail: 'L’état du compte cloud est vérifié.',
    );
  }
  if (!authSession.isSignedIn) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.account,
      title: 'Compte CommandGlows',
      state: CloudSyncCategoryState.localOnly,
      stateLabel: 'Non connecté',
      detail: 'Mode local actif.',
    );
  }
  if (authSession.isLocalFallback) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.account,
      title: 'Compte CommandGlows',
      state: CloudSyncCategoryState.localOnly,
      stateLabel: 'Mode local',
      detail: 'Compte de secours actif. Le mode local reste séparé du cloud.',
    );
  }
  return CloudSyncCategoryStatus(
    category: CloudSyncCategory.account,
    title: 'Compte CommandGlows',
    state: CloudSyncCategoryState.synced,
    stateLabel: 'Compte vérifié',
    detail:
        'Compte cloud connecté (${authSession.user?.email ?? authSession.user?.provider.name}).',
  );
}

CloudSyncCategoryStatus _suiteAccessStatus({
  required bool remoteAuthConfigured,
  required bool authLoading,
  required bool suiteLoading,
  required AuthSessionSnapshot? authSession,
  required SuiteIdentitySnapshot? suiteIdentity,
  required String? authError,
  required String? suiteError,
}) {
  if (!remoteAuthConfigured) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.suiteAccess,
      title: 'Accès CommandGlows',
      state: CloudSyncCategoryState.unavailable,
      stateLabel: 'Non configuré',
      detail: 'Le cloud CommandGlows n’est pas disponible dans cette version.',
    );
  }
  if (authError != null) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.suiteAccess,
      title: 'Accès CommandGlows',
      state: CloudSyncCategoryState.unavailable,
      stateLabel: 'Accès indisponible',
      detail: 'Le statut d’accès CommandGlows est indisponible pour l’instant.',
    );
  }
  if (authLoading || authSession == null || suiteLoading) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.suiteAccess,
      title: 'Accès CommandGlows',
      state: CloudSyncCategoryState.checking,
      stateLabel: 'Vérification',
      detail: 'L’accès CommandGlows est vérifié.',
    );
  }
  if (!authSession.isSignedIn || authSession.isLocalFallback) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.suiteAccess,
      title: 'Accès CommandGlows',
      state: CloudSyncCategoryState.localOnly,
      stateLabel: 'Non connecté',
      detail:
          'Connecte ton compte CommandGlows pour activer la synchronisation de données.',
    );
  }
  if (suiteError != null) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.suiteAccess,
      title: 'Accès CommandGlows',
      state: CloudSyncCategoryState.failed,
      stateLabel: 'Vérification impossible',
      detail:
          'L’identité suite est temporairement indisponible. '
          'Le mode local reste actif.',
    );
  }
  final hasAccess =
      suiteIdentity?.statusFor(ProductId.commandglowsApp) ==
      SuiteAccountStatus.accessActive;
  if (hasAccess) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.suiteAccess,
      title: 'Accès CommandGlows',
      state: CloudSyncCategoryState.synced,
      stateLabel: 'Active',
      detail:
          'Le compte a bien accès CommandGlows. La synchronisation peut être active '
          'quand le store distant est engagé.',
    );
  }
  return CloudSyncCategoryStatus(
    category: CloudSyncCategory.suiteAccess,
    title: 'Accès CommandGlows',
    state: suiteIdentity?.status == SuiteAccountStatus.linkingRequired
        ? CloudSyncCategoryState.failed
        : CloudSyncCategoryState.unavailable,
    stateLabel: suiteIdentity?.status == SuiteAccountStatus.linkingRequired
        ? 'Liaison requise'
        : 'Inactif',
    detail: suiteIdentity?.status == SuiteAccountStatus.linkingRequired
        ? 'La liaison de compte CommandGlows doit être confirmée.'
        : 'Accès cloud non activé pour ce compte, les données restent locales.',
  );
}

CloudSyncCategoryStatus _dataCategoryStatus({
  required CloudSyncCategory category,
  required String title,
  required bool remoteEnabled,
  required LocalCloudDomainStatus? localCloudDomainStatus,
  required bool remoteAuthConfigured,
  required AuthSessionSnapshot? authSession,
  required String? authError,
  required SuiteIdentitySnapshot? suiteIdentity,
  required String? suiteError,
  required bool hasSuiteAccess,
}) {
  if (!remoteAuthConfigured) {
    return CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.unavailable,
      stateLabel: 'Cloud indisponible',
      detail:
          'Cloud non configuré. Cette donnée reste locale dans cette version.',
    );
  }
  if (authError != null) {
    return CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.unavailable,
      stateLabel: 'Indisponible',
      detail:
          'Le statut cloud est indisponible pour l’instant. '
          'La donnée reste locale.',
    );
  }
  if (suiteError != null) {
    return CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.unavailable,
      stateLabel: 'Vérification interrompue',
      detail:
          'L’identité suite est indisponible. Vérification du statut en cours '
          'à la prochaine reprise.',
    );
  }
  if (authSession == null ||
      !authSession.isSignedIn ||
      authSession.isLocalFallback) {
    return CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.localOnly,
      stateLabel: 'Local uniquement',
      detail: '$title reste local tant que la session cloud n’est pas active.',
    );
  }
  if (!hasSuiteAccess) {
    return CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.localOnly,
      stateLabel: 'Accès CommandGlows inactif',
      detail:
          'Le compte existe mais pas d’accès CommandGlows actif pour cette catégorie.',
    );
  }
  if (!remoteEnabled) {
    return CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.unavailable,
      stateLabel: 'Statut non mesuré',
      detail:
          'Le statut cloud de cette donnée n’est pas encore mesuré pour cette session.',
    );
  }
  if (localCloudDomainStatus != null) {
    return _localCloudDomainToCategoryStatus(
      category: category,
      title: title,
      status: localCloudDomainStatus,
    );
  }
  return CloudSyncCategoryStatus(
    category: category,
    title: title,
    state: CloudSyncCategoryState.notMeasured,
    stateLabel: 'État non mesuré',
    detail:
        '$title : le routeur cloud est actif, mais le statut de synchronisation n’est pas exposé.',
  );
}

CloudSyncCategoryStatus _localCloudDomainToCategoryStatus({
  required CloudSyncCategory category,
  required String title,
  required LocalCloudDomainStatus status,
}) {
  return switch (status.state) {
    LocalCloudSyncCategoryState.synced => CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.synced,
      stateLabel: 'Synchronisé',
      detail: status.detail,
    ),
    LocalCloudSyncCategoryState.syncing => CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.syncing,
      stateLabel: 'Synchronisation',
      detail: status.detail,
    ),
    LocalCloudSyncCategoryState.pending => CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.pending,
      stateLabel: 'En attente',
      detail: status.detail,
    ),
    LocalCloudSyncCategoryState.conflict => CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.conflict,
      stateLabel: 'Conflit',
      detail: status.detail,
    ),
    LocalCloudSyncCategoryState.failed => CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.failed,
      stateLabel: 'Erreur',
      detail: status.detail,
    ),
    LocalCloudSyncCategoryState.blocked => CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.conflict,
      stateLabel: 'Confirmation requise',
      detail: status.detail,
    ),
    LocalCloudSyncCategoryState.localOnly => CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.localOnly,
      stateLabel: 'Local uniquement',
      detail: status.detail,
    ),
    LocalCloudSyncCategoryState.unavailable => CloudSyncCategoryStatus(
      category: category,
      title: title,
      state: CloudSyncCategoryState.unavailable,
      stateLabel: 'Indisponible',
      detail: status.detail,
    ),
  };
}

CloudSyncCategoryStatus _keyboardCategoryStatus({
  required bool keyboardImeSupported,
  required CloudSyncCategoryStatus keyboardStatus,
}) {
  if (!keyboardImeSupported) {
    return CloudSyncCategoryStatus(
      category: CloudSyncCategory.keyboardProfile,
      title: 'Profil clavier Android',
      state: CloudSyncCategoryState.platformUnavailable,
      stateLabel: 'Non disponible',
      detail:
          'Le clavier Android n’est pas disponible sur cette plateforme. '
          'La synchronisation clavier n’est pas supportée.',
    );
  }
  return CloudSyncCategoryStatus(
    category: CloudSyncCategory.keyboardProfile,
    title: keyboardStatus.title,
    state: keyboardStatus.state,
    stateLabel: keyboardStatus.stateLabel,
    detail: keyboardStatus.detail,
  );
}

CloudSyncCategoryStatus _keyboardStatus({
  required bool remoteAuthConfigured,
  required bool keyboardImeSupported,
  required AuthSessionSnapshot? authSession,
  required String? authError,
  required SuiteIdentitySnapshot? suiteIdentity,
  required String? suiteError,
  required bool keyboardRemoteSyncActive,
  required KeyboardSyncControllerState keyboardControllerState,
}) {
  if (!keyboardImeSupported) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.keyboardProfile,
      title: 'Profil clavier Android',
      state: CloudSyncCategoryState.platformUnavailable,
      stateLabel: 'Non disponible',
      detail: 'Le clavier Android n’est pas supporté sur cette plateforme.',
    );
  }
  if (authError != null || suiteError != null) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.keyboardProfile,
      title: 'Profil clavier Android',
      state: CloudSyncCategoryState.unavailable,
      stateLabel: 'Vérification indisponible',
      detail:
          'Le statut clavier n’est pas fiable pour l’instant. Reviens plus tard.',
    );
  }
  if (!remoteAuthConfigured ||
      authSession == null ||
      !authSession.isSignedIn ||
      authSession.isLocalFallback) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.keyboardProfile,
      title: 'Profil clavier Android',
      state: CloudSyncCategoryState.localOnly,
      stateLabel: 'Session locale',
      detail:
          'Le profil clavier Android dépend d’un compte cloud CommandGlows actif.',
    );
  }
  if (suiteIdentity?.statusFor(ProductId.commandglowsApp) !=
      SuiteAccountStatus.accessActive) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.keyboardProfile,
      title: 'Profil clavier Android',
      state: CloudSyncCategoryState.localOnly,
      stateLabel: 'Accès inactif',
      detail: 'Sans accès CommandGlows actif, le profil clavier reste local.',
    );
  }
  if (!keyboardRemoteSyncActive) {
    return const CloudSyncCategoryStatus(
      category: CloudSyncCategory.keyboardProfile,
      title: 'Profil clavier Android',
      state: CloudSyncCategoryState.localOnly,
      stateLabel: 'Cloud clavier désactivé',
      detail: 'Le profil clavier cloud n’est pas engagé pour ce compte.',
    );
  }

  switch (keyboardControllerState.status) {
    case KeyboardSyncControllerStatus.waitingCloud:
      return const CloudSyncCategoryStatus(
        category: CloudSyncCategory.keyboardProfile,
        title: 'Profil clavier Android',
        state: CloudSyncCategoryState.checking,
        stateLabel: 'Vérification',
        detail: 'Le profil clavier est comparé au cloud.',
      );
    case KeyboardSyncControllerStatus.applying:
      return const CloudSyncCategoryStatus(
        category: CloudSyncCategory.keyboardProfile,
        title: 'Profil clavier Android',
        state: CloudSyncCategoryState.syncing,
        stateLabel: 'Application en cours',
        detail: 'Le profil clavier est en cours de synchronisation.',
      );
    case KeyboardSyncControllerStatus.dataReceived:
      return const CloudSyncCategoryStatus(
        category: CloudSyncCategory.keyboardProfile,
        title: 'Profil clavier Android',
        state: CloudSyncCategoryState.syncing,
        stateLabel: 'Synchronisation',
        detail: 'Chargement du profil clavier depuis le cloud.',
      );
    case KeyboardSyncControllerStatus.ready:
      return keyboardControllerState.hasPendingQueue
          ? const CloudSyncCategoryStatus(
              category: CloudSyncCategory.keyboardProfile,
              title: 'Profil clavier Android',
              state: CloudSyncCategoryState.pending,
              stateLabel: 'En attente',
              detail:
                  'Des modifications locales du profil clavier attendent une '
                  'mise à jour cloud.',
            )
          : const CloudSyncCategoryStatus(
              category: CloudSyncCategory.keyboardProfile,
              title: 'Profil clavier Android',
              state: CloudSyncCategoryState.synced,
              stateLabel: 'Synchronisé',
              detail: 'Le profil clavier est aligné avec le cloud.',
            );
    case KeyboardSyncControllerStatus.partial:
      return CloudSyncCategoryStatus(
        category: CloudSyncCategory.keyboardProfile,
        title: 'Profil clavier Android',
        state: CloudSyncCategoryState.pending,
        stateLabel: 'Restauration partielle',
        detail:
            keyboardControllerState.issueMessage ??
            'Le profil clavier est restauré partiellement.',
      );
    case KeyboardSyncControllerStatus.failed:
      return CloudSyncCategoryStatus(
        category: CloudSyncCategory.keyboardProfile,
        title: 'Profil clavier Android',
        state: CloudSyncCategoryState.failed,
        stateLabel: 'Erreur',
        detail:
            keyboardControllerState.issueMessage ??
            'Échec de la synchronisation du profil clavier.',
      );
    case KeyboardSyncControllerStatus.decisionNeeded:
      return CloudSyncCategoryStatus(
        category: CloudSyncCategory.keyboardProfile,
        title: 'Profil clavier Android',
        state: CloudSyncCategoryState.conflict,
        stateLabel: 'Conflit',
        detail:
            keyboardControllerState.issueMessage ??
            'Conflit entre le profil local et le profil cloud.',
      );
  }
}

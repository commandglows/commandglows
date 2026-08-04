import '../../../core/diagnostics/sensitive_redactor.dart';

enum AuthFailureKind {
  invalidInput,
  invalidCredentials,
  accountDisabled,
  accountExistsWithDifferentCredential,
  weakPassword,
  providerDisabled,
  firebaseConfiguration,
  networkUnavailable,
  rateLimited,
  googleCanceled,
  googleInterrupted,
  googleConfiguration,
  googleUnavailable,
  unsupported,
  unexpected,
}

class AuthFailure implements Exception {
  const AuthFailure({
    required this.kind,
    required this.userMessage,
    required this.category,
    this.code,
    this.supportDetail,
    this.reportToSentry = true,
  });

  final AuthFailureKind kind;
  final String userMessage;
  final String category;
  final String? code;
  final Object? supportDetail;
  final bool reportToSentry;

  String get safeSupportDetail {
    final parts = [
      if (code != null && code!.trim().isNotEmpty) 'code=$code',
      if (supportDetail != null && supportDetail.toString().trim().isNotEmpty)
        supportDetail,
    ];
    if (parts.isEmpty) {
      return 'Aucun détail technique disponible.';
    }
    return redact(parts.join(' | '));
  }

  static String redact(Object? value) => SensitiveRedactor.redact(value);

  static AuthFailure unsupported(Object error) {
    final message = error.toString();
    if (message.contains('Google Sign-In')) {
      return googleConfiguration(
        code: 'google-sign-in-unconfigured',
        detail: message,
      );
    }
    if (message.contains('Remote auth')) {
      return const AuthFailure(
        kind: AuthFailureKind.unsupported,
        userMessage:
            'La connexion distante n’est pas configurée sur cet environnement.',
        category: 'auth_unsupported',
        code: 'remote-auth-unconfigured',
        supportDetail: 'Remote auth is not configured.',
      );
    }
    return AuthFailure(
      kind: AuthFailureKind.unsupported,
      userMessage: 'Cette méthode de connexion n’est pas disponible.',
      category: 'auth_unsupported',
      code: 'unsupported',
      supportDetail: message,
    );
  }

  static AuthFailure firebase({
    required String code,
    required String? message,
    required bool signup,
  }) {
    final normalizedMessage = message ?? '';
    final normalizedCode = code.trim().toLowerCase().replaceAll('_', '-');
    if (_isFirebaseConfigurationMessage(normalizedMessage)) {
      return AuthFailure(
        kind: AuthFailureKind.firebaseConfiguration,
        userMessage:
            'La configuration Firebase de cette version est invalide. Le détail technique peut être copié pour correction.',
        category: 'auth_firebase_configuration',
        code: code,
        supportDetail: message,
      );
    }

    switch (normalizedCode) {
      case 'invalid-email':
        return AuthFailure(
          kind: AuthFailureKind.invalidInput,
          userMessage: 'L’email saisi n’est pas valide.',
          category: 'auth_firebase_invalid_input',
          code: code,
          supportDetail: message,
        );
      case 'user-disabled':
        return AuthFailure(
          kind: AuthFailureKind.accountDisabled,
          userMessage: 'Ce compte a été désactivé.',
          category: 'auth_firebase_account_disabled',
          code: code,
          supportDetail: message,
        );
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
      case 'invalid-login-credentials':
        return AuthFailure(
          kind: AuthFailureKind.invalidCredentials,
          userMessage: 'Email ou mot de passe incorrect.',
          category: 'auth_firebase_invalid_credentials',
          code: code,
          supportDetail: message,
        );
      case 'email-already-in-use':
        return AuthFailure(
          kind: AuthFailureKind.accountExistsWithDifferentCredential,
          userMessage: 'Un compte existe déjà avec cet email.',
          category: 'auth_firebase_account_exists',
          code: code,
          supportDetail: message,
        );
      case 'weak-password':
        return AuthFailure(
          kind: AuthFailureKind.weakPassword,
          userMessage: 'Choisis un mot de passe plus robuste.',
          category: 'auth_firebase_weak_password',
          code: code,
          supportDetail: message,
        );
      case 'operation-not-allowed':
        return AuthFailure(
          kind: AuthFailureKind.providerDisabled,
          userMessage: signup
              ? 'La création de compte email n’est pas activée.'
              : 'La connexion email n’est pas activée.',
          category: 'auth_firebase_provider_disabled',
          code: code,
          supportDetail: message,
        );
      case 'invalid-api-key':
      case 'app-not-authorized':
        return AuthFailure(
          kind: AuthFailureKind.firebaseConfiguration,
          userMessage:
              'La configuration Firebase de cette version est invalide. Le détail technique peut être copié pour correction.',
          category: 'auth_firebase_configuration',
          code: code,
          supportDetail: message,
        );
      case 'network-request-failed':
        return AuthFailure(
          kind: AuthFailureKind.networkUnavailable,
          userMessage:
              'Connexion réseau indisponible. Vérifie ta connexion internet.',
          category: 'auth_firebase_network',
          code: code,
          supportDetail: message,
        );
      case 'too-many-requests':
        return AuthFailure(
          kind: AuthFailureKind.rateLimited,
          userMessage: 'Trop de tentatives. Réessaie dans quelques minutes.',
          category: 'auth_firebase_rate_limited',
          code: code,
          supportDetail: message,
        );
      case 'account-exists-with-different-credential':
        return AuthFailure(
          kind: AuthFailureKind.accountExistsWithDifferentCredential,
          userMessage:
              'Un compte existe déjà avec cet email via une autre méthode.',
          category: 'auth_firebase_account_exists_with_different_credential',
          code: code,
          supportDetail: message,
        );
      case 'popup-closed-by-user':
      case 'canceled':
        return const AuthFailure(
          kind: AuthFailureKind.googleCanceled,
          userMessage: 'Connexion annulée.',
          category: 'auth_google_canceled',
          code: 'canceled',
          reportToSentry: false,
        );
      default:
        return AuthFailure(
          kind: AuthFailureKind.unexpected,
          userMessage: signup
              ? 'Création de compte impossible pour le moment.'
              : 'Connexion impossible pour le moment.',
          category: 'auth_firebase_unexpected',
          code: code,
          supportDetail: message,
        );
    }
  }

  static bool _isFirebaseConfigurationMessage(String message) {
    final normalized = message.toLowerCase();
    return normalized.contains('configuration_not_found') ||
        normalized.contains('configuration not found') ||
        normalized.contains('auth configuration');
  }

  static AuthFailure googleCanceled({String? detail}) {
    return AuthFailure(
      kind: AuthFailureKind.googleCanceled,
      userMessage: 'Connexion Google annulée.',
      category: 'auth_google_canceled',
      code: 'canceled',
      supportDetail: detail,
      reportToSentry: false,
    );
  }

  static AuthFailure googleInterrupted({String? code, String? detail}) {
    return AuthFailure(
      kind: AuthFailureKind.googleInterrupted,
      userMessage: 'Connexion Google interrompue. Réessaie.',
      category: 'auth_google_interrupted',
      code: code ?? 'interrupted',
      supportDetail: detail,
    );
  }

  static AuthFailure googleConfiguration({String? code, String? detail}) {
    return AuthFailure(
      kind: AuthFailureKind.googleConfiguration,
      userMessage:
          'Connexion Google indisponible sur cette version. Le détail technique peut être copié pour correction.',
      category: 'auth_google_configuration',
      code: code ?? 'google-configuration',
      supportDetail: detail,
    );
  }

  static AuthFailure googleUnavailable({String? code, String? detail}) {
    return AuthFailure(
      kind: AuthFailureKind.googleUnavailable,
      userMessage: 'Connexion Google indisponible sur cet environnement.',
      category: 'auth_google_unavailable',
      code: code ?? 'google-unavailable',
      supportDetail: detail,
    );
  }

  static AuthFailure unexpected(Object error) {
    return AuthFailure(
      kind: AuthFailureKind.unexpected,
      userMessage:
          'Connexion impossible pour le moment. Réessaie dans quelques instants.',
      category: 'auth_unexpected',
      code: 'unexpected',
      supportDetail: error,
    );
  }

  @override
  String toString() {
    return 'AuthFailure(kind=$kind, code=$code)';
  }
}

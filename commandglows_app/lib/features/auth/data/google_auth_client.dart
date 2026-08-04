import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../domain/auth_failure.dart';

class GoogleAuthRuntimeConfig {
  const GoogleAuthRuntimeConfig({
    required this.webClientId,
    required this.isWeb,
    required this.targetPlatform,
  });

  factory GoogleAuthRuntimeConfig.fromEnvironment({
    String webClientId = const String.fromEnvironment(
      webClientIdEnvironmentName,
    ),
    bool? isWeb,
    TargetPlatform? targetPlatform,
  }) {
    return GoogleAuthRuntimeConfig(
      webClientId: webClientId,
      isWeb: isWeb ?? kIsWeb,
      targetPlatform: targetPlatform ?? defaultTargetPlatform,
    );
  }

  static const webClientIdEnvironmentName = 'FIREBASE_WEB_CLIENT_ID';

  final String webClientId;
  final bool isWeb;
  final TargetPlatform targetPlatform;

  String? get normalizedWebClientId {
    final normalized = webClientId.trim();
    return normalized.isEmpty ? null : normalized;
  }

  bool get requiresServerClientId =>
      !isWeb && targetPlatform == TargetPlatform.android;

  String? get clientId => isWeb ? normalizedWebClientId : null;

  String? get serverClientId =>
      requiresServerClientId ? normalizedWebClientId : null;

  List<String> get missingEnvironmentNames => [
    if (requiresServerClientId && normalizedWebClientId == null)
      webClientIdEnvironmentName,
  ];

  void ensurePlatformConfiguration() {
    if (missingEnvironmentNames.isEmpty) {
      return;
    }
    throw AuthFailure.googleConfiguration(
      code: 'missing-server-client-id',
      detail:
          'Google Sign-In requires $webClientIdEnvironmentName '
          'as the Android serverClientId.',
    );
  }
}

class GoogleAuthResult {
  const GoogleAuthResult({required this.idToken});

  final String? idToken;
}

abstract class GoogleAuthClient {
  Future<void> initialize();

  bool supportsAuthenticate();

  bool requiresRenderedButton();

  Stream<GoogleAuthResult> authenticationResults();

  Future<GoogleAuthResult> authenticate();
}

class PluginGoogleAuthClient implements GoogleAuthClient {
  PluginGoogleAuthClient({
    GoogleSignIn? googleSignIn,
    GoogleAuthRuntimeConfig? config,
  }) : _googleSignIn = googleSignIn ?? GoogleSignIn.instance,
       _usesSharedGoogleSignIn = googleSignIn == null,
       _config = config ?? GoogleAuthRuntimeConfig.fromEnvironment();

  final GoogleSignIn _googleSignIn;
  final bool _usesSharedGoogleSignIn;
  final GoogleAuthRuntimeConfig _config;
  var _initialized = false;
  static Future<void>? _sharedInitialization;
  static String? _sharedClientId;
  static String? _sharedServerClientId;

  @override
  Future<void> initialize() async {
    if (_initialized) {
      return;
    }
    _config.ensurePlatformConfiguration();
    if (_usesSharedGoogleSignIn) {
      await _initializeSharedGoogleSignIn();
    } else {
      await _initializePlugin();
    }
    _initialized = true;
  }

  Future<void> _initializeSharedGoogleSignIn() async {
    final clientId = _config.clientId;
    final serverClientId = _config.serverClientId;
    final existingInitialization = _sharedInitialization;
    if (existingInitialization != null) {
      if (_sharedClientId != clientId ||
          _sharedServerClientId != serverClientId) {
        throw AuthFailure.googleConfiguration(
          code: 'google-sign-in-reinitialized',
          detail:
              'Google Sign-In was initialized with a different client configuration.',
        );
      }
      await existingInitialization;
      return;
    }

    _sharedClientId = clientId;
    _sharedServerClientId = serverClientId;
    final initialization = _initializePlugin();
    _sharedInitialization = initialization;
    try {
      await initialization;
    } catch (_) {
      if (identical(_sharedInitialization, initialization)) {
        _sharedInitialization = null;
        _sharedClientId = null;
        _sharedServerClientId = null;
      }
      rethrow;
    }
  }

  Future<void> _initializePlugin() async {
    try {
      await _googleSignIn.initialize(
        clientId: _config.clientId,
        serverClientId: _config.serverClientId,
      );
    } on StateError catch (error) {
      if (error.message.contains('init() has already been called')) {
        return;
      }
      rethrow;
    }
  }

  @override
  bool supportsAuthenticate() => _googleSignIn.supportsAuthenticate();

  @override
  bool requiresRenderedButton() => _config.isWeb && !supportsAuthenticate();

  @override
  Stream<GoogleAuthResult> authenticationResults() async* {
    await for (final event in _googleSignIn.authenticationEvents) {
      switch (event) {
        case GoogleSignInAuthenticationEventSignIn(user: final user):
          yield GoogleAuthResult(idToken: user.authentication.idToken);
        case GoogleSignInAuthenticationEventSignOut():
          break;
      }
    }
  }

  @override
  Future<GoogleAuthResult> authenticate() async {
    try {
      final account = await _googleSignIn.authenticate();
      return GoogleAuthResult(idToken: account.authentication.idToken);
    } on GoogleSignInException catch (error) {
      throw GoogleAuthFailureMapper.fromException(error);
    }
  }
}

class GoogleAuthFailureMapper {
  GoogleAuthFailureMapper._();

  static AuthFailure fromException(GoogleSignInException error) {
    final code = error.code;
    final detail =
        'Google Sign-In error (${code.name}): '
        '${AuthFailure.redact(error.description ?? error.toString())}';
    switch (code) {
      case GoogleSignInExceptionCode.canceled:
        final text = '${error.description ?? ''} ${error.details ?? ''}'
            .toLowerCase();
        if (_looksLikeConfigurationFailure(text)) {
          return AuthFailure.googleConfiguration(
            code: code.name,
            detail: detail,
          );
        }
        return AuthFailure.googleCanceled(detail: detail);
      case GoogleSignInExceptionCode.interrupted:
        return AuthFailure.googleInterrupted(code: code.name, detail: detail);
      case GoogleSignInExceptionCode.clientConfigurationError:
      case GoogleSignInExceptionCode.providerConfigurationError:
        return AuthFailure.googleConfiguration(code: code.name, detail: detail);
      case GoogleSignInExceptionCode.uiUnavailable:
      case GoogleSignInExceptionCode.userMismatch:
        return AuthFailure.googleUnavailable(code: code.name, detail: detail);
      case GoogleSignInExceptionCode.unknownError:
        return AuthFailure.googleConfiguration(code: code.name, detail: detail);
    }
  }

  static bool _looksLikeConfigurationFailure(String text) {
    return text.contains('configuration') ||
        text.contains('client') ||
        text.contains('serverclientid') ||
        text.contains('server client') ||
        text.contains('sha') ||
        text.contains('package') ||
        text.contains('oauth');
  }
}

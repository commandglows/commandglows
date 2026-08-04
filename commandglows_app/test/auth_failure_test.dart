import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:commandglows_app/features/auth/data/google_auth_client.dart';
import 'package:commandglows_app/features/auth/domain/auth_failure.dart';

void main() {
  test('redacts tokens api keys and password-like values', () {
    final detail = AuthFailure.redact(
      'apiKey=AIza123456789012345678901234 token=eyJabcdefghijklmnopqrst password=secret',
    );

    expect(detail, contains('<redacted>'));
    expect(detail, isNot(contains('AIza123')));
    expect(detail, isNot(contains('eyJabcdefghijklmnopqrst')));
    expect(detail, isNot(contains('secret')));
  });

  test('maps firebase invalid credentials without account enumeration', () {
    final failure = AuthFailure.firebase(
      code: 'invalid-credential',
      message: 'bad credential',
      signup: false,
    );

    expect(failure.kind, AuthFailureKind.invalidCredentials);
    expect(failure.userMessage, 'Email ou mot de passe incorrect.');
  });

  test('maps firebase rest invalid login credentials', () {
    final failure = AuthFailure.firebase(
      code: 'INVALID_LOGIN_CREDENTIALS',
      message: 'INVALID_LOGIN_CREDENTIALS',
      signup: false,
    );

    expect(failure.kind, AuthFailureKind.invalidCredentials);
    expect(failure.userMessage, 'Email ou mot de passe incorrect.');
  });

  test('maps firebase configuration not found as configuration failure', () {
    final failure = AuthFailure.firebase(
      code: 'unknown',
      message: 'An internal error has occurred. [ CONFIGURATION_NOT_FOUND ]',
      signup: true,
    );

    expect(failure.kind, AuthFailureKind.firebaseConfiguration);
    expect(failure.category, 'auth_firebase_configuration');
    expect(failure.userMessage, contains('configuration Firebase'));
  });

  test('maps google canceled config hints as configuration failure', () {
    final failure = GoogleAuthFailureMapper.fromException(
      const GoogleSignInException(
        code: GoogleSignInExceptionCode.canceled,
        description: 'Missing server client ID configuration',
      ),
    );

    expect(failure.kind, AuthFailureKind.googleConfiguration);
    expect(failure.reportToSentry, isTrue);
  });

  test('maps plain google canceled as non-sentry cancellation', () {
    final failure = GoogleAuthFailureMapper.fromException(
      const GoogleSignInException(
        code: GoogleSignInExceptionCode.canceled,
        description: 'The user canceled sign in',
      ),
    );

    expect(failure.kind, AuthFailureKind.googleCanceled);
    expect(failure.reportToSentry, isFalse);
  });

  test('requires web OAuth client id as Android server client id', () {
    const config = GoogleAuthRuntimeConfig(
      webClientId: ' ',
      isWeb: false,
      targetPlatform: TargetPlatform.android,
    );

    expect(config.missingEnvironmentNames, [
      GoogleAuthRuntimeConfig.webClientIdEnvironmentName,
    ]);
    expect(
      config.ensurePlatformConfiguration,
      throwsA(
        isA<AuthFailure>()
            .having(
              (failure) => failure.kind,
              'kind',
              AuthFailureKind.googleConfiguration,
            )
            .having(
              (failure) => failure.code,
              'code',
              'missing-server-client-id',
            ),
      ),
    );
  });

  test('uses web OAuth client id as Android server client id', () {
    const config = GoogleAuthRuntimeConfig(
      webClientId: ' 123.apps.googleusercontent.com ',
      isWeb: false,
      targetPlatform: TargetPlatform.android,
    );

    expect(config.missingEnvironmentNames, isEmpty);
    expect(config.serverClientId, '123.apps.googleusercontent.com');
    expect(config.clientId, isNull);
  });

  test('uses web OAuth client id as web client id only', () {
    const config = GoogleAuthRuntimeConfig(
      webClientId: '123.apps.googleusercontent.com',
      isWeb: true,
      targetPlatform: TargetPlatform.android,
    );

    expect(config.missingEnvironmentNames, isEmpty);
    expect(config.clientId, '123.apps.googleusercontent.com');
    expect(config.serverClientId, isNull);
  });
}

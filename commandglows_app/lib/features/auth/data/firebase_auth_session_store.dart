import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/sync/sync_status.dart';
import '../domain/auth_failure.dart';
import '../domain/auth_session_store.dart';
import 'google_auth_client.dart';

class FirebaseAuthSessionStore implements AuthSessionStore {
  FirebaseAuthSessionStore({
    firebase_auth.FirebaseAuth? auth,
    GoogleSignIn? googleSignIn,
    GoogleAuthClient? googleAuthClient,
  }) : _auth = auth,
       _googleAuthClient =
           googleAuthClient ??
           PluginGoogleAuthClient(googleSignIn: googleSignIn);

  final firebase_auth.FirebaseAuth? _auth;
  final GoogleAuthClient _googleAuthClient;

  firebase_auth.FirebaseAuth get _firebaseAuth =>
      _auth ?? firebase_auth.FirebaseAuth.instance;

  @override
  Future<AuthSessionSnapshot> currentSession() async {
    return _fromUser(_firebaseAuth.currentUser);
  }

  @override
  Stream<AuthSessionSnapshot> watchSession() {
    return _firebaseAuth.authStateChanges().map(_fromUser);
  }

  @override
  Future<void> signInAnonymously() async {
    try {
      await _firebaseAuth.signInAnonymously();
    } on firebase_auth.FirebaseAuthException catch (error) {
      throw AuthFailure.firebase(
        code: error.code,
        message: error.message,
        signup: false,
      );
    }
  }

  @override
  Future<void> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {
    try {
      await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on firebase_auth.FirebaseAuthException catch (error) {
      throw AuthFailure.firebase(
        code: error.code,
        message: error.message,
        signup: false,
      );
    }
  }

  @override
  Future<void> createAccountWithEmailPassword({
    required String email,
    required String password,
  }) async {
    try {
      await _firebaseAuth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on firebase_auth.FirebaseAuthException catch (error) {
      throw AuthFailure.firebase(
        code: error.code,
        message: error.message,
        signup: true,
      );
    }
  }

  @override
  Future<void> signInWithGoogle() async {
    try {
      await _googleAuthClient.initialize();
      if (!_googleAuthClient.supportsAuthenticate()) {
        throw AuthFailure.googleUnavailable(
          code: 'authenticate-unsupported',
          detail: 'Google Sign-In authenticate is not supported here.',
        );
      }
      final auth = await _googleAuthClient.authenticate();
      await signInWithGoogleIdToken(idToken: auth.idToken);
    } on AuthFailure {
      rethrow;
    } on firebase_auth.FirebaseAuthException catch (error) {
      throw AuthFailure.firebase(
        code: error.code,
        message: error.message,
        signup: false,
      );
    } on GoogleSignInException catch (error) {
      throw AuthFailure.googleConfiguration(
        code: error.code.name,
        detail: error.description ?? error.toString(),
      );
    } catch (error) {
      throw AuthFailure.unexpected(error);
    }
  }

  @override
  Future<void> signInWithGoogleIdToken({required String? idToken}) async {
    try {
      final normalizedIdToken = idToken?.trim();
      if (normalizedIdToken == null || normalizedIdToken.isEmpty) {
        throw AuthFailure.googleConfiguration(
          code: 'missing-id-token',
          detail: 'Google Sign-In returned no idToken for Firebase credential.',
        );
      }
      final credential = firebase_auth.GoogleAuthProvider.credential(
        idToken: normalizedIdToken,
      );
      await _firebaseAuth.signInWithCredential(credential);
    } on AuthFailure {
      rethrow;
    } on firebase_auth.FirebaseAuthException catch (error) {
      throw AuthFailure.firebase(
        code: error.code,
        message: error.message,
        signup: false,
      );
    } catch (error) {
      throw AuthFailure.unexpected(error);
    }
  }

  @override
  Future<void> signOut() async {
    await _firebaseAuth.signOut();
  }

  static AuthSessionSnapshot _fromUser(firebase_auth.User? user) {
    if (user == null) {
      return const AuthSessionSnapshot(
        user: null,
        syncStatus: SyncStatus.unavailable(),
      );
    }

    return AuthSessionSnapshot(
      user: AuthUserSnapshot(
        id: user.uid,
        provider: _providerFromUser(user),
        email: user.email,
        isAnonymous: user.isAnonymous,
      ),
      syncStatus: SyncStatus(
        health: SyncHealth.synced,
        lastSyncedAt: DateTime.now().toUtc(),
      ),
    );
  }

  static AuthProviderKind _providerFromUser(firebase_auth.User user) {
    if (user.isAnonymous) {
      return AuthProviderKind.anonymous;
    }
    final providerIds = user.providerData.map((info) => info.providerId);
    if (providerIds.contains('google.com')) {
      return AuthProviderKind.google;
    }
    return AuthProviderKind.emailPassword;
  }
}

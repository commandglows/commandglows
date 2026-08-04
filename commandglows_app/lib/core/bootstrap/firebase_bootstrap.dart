import 'package:firebase_core/firebase_core.dart';

class FirebaseRuntimeConfig {
  const FirebaseRuntimeConfig({
    required this.projectId,
    required this.apiKey,
    required this.appId,
    required this.messagingSenderId,
    required this.authDomain,
    required this.storageBucket,
    required this.missingEnvironmentNames,
  });

  final String projectId;
  final String apiKey;
  final String appId;
  final String messagingSenderId;
  final String authDomain;
  final String storageBucket;
  final List<String> missingEnvironmentNames;

  bool get isComplete => missingEnvironmentNames.isEmpty;

  FirebaseOptions toOptions() {
    return FirebaseOptions(
      projectId: projectId,
      apiKey: apiKey,
      appId: appId,
      messagingSenderId: messagingSenderId,
      authDomain: authDomain.isEmpty ? null : authDomain,
      storageBucket: storageBucket.isEmpty ? null : storageBucket,
    );
  }
}

class FirebaseBootstrap {
  static const projectIdEnvironmentName = 'FIREBASE_PROJECT_ID';
  static const apiKeyEnvironmentName = 'FIREBASE_API_KEY';
  static const appIdEnvironmentName = 'FIREBASE_APP_ID';
  static const messagingSenderIdEnvironmentName =
      'FIREBASE_MESSAGING_SENDER_ID';
  static const authDomainEnvironmentName = 'FIREBASE_AUTH_DOMAIN';
  static const storageBucketEnvironmentName = 'FIREBASE_STORAGE_BUCKET';

  static bool _initialized = false;
  static String? _initError;

  static bool get isInitialized => _initialized;
  static bool get isConfigured => _initialized && _initError == null;
  static String? get initError => _initError;

  static Future<void> init() async {
    final config = resolveConfig(
      projectId: const String.fromEnvironment(projectIdEnvironmentName),
      apiKey: const String.fromEnvironment(apiKeyEnvironmentName),
      appId: const String.fromEnvironment(appIdEnvironmentName),
      messagingSenderId: const String.fromEnvironment(
        messagingSenderIdEnvironmentName,
      ),
      authDomain: const String.fromEnvironment(authDomainEnvironmentName),
      storageBucket: const String.fromEnvironment(storageBucketEnvironmentName),
    );

    if (!config.isComplete) {
      _initialized = false;
      _initError =
          'Firebase configuration is missing: '
          '${config.missingEnvironmentNames.join(', ')}.';
      return;
    }

    try {
      await Firebase.initializeApp(options: config.toOptions());
      _initialized = true;
      _initError = null;
    } catch (error) {
      _initialized = false;
      _initError = 'Firebase initialization failed: $error';
    }
  }

  static FirebaseRuntimeConfig resolveConfig({
    required String projectId,
    required String apiKey,
    required String appId,
    required String messagingSenderId,
    required String authDomain,
    required String storageBucket,
  }) {
    final normalizedProjectId = projectId.trim();
    final normalizedApiKey = apiKey.trim();
    final normalizedAppId = appId.trim();
    final normalizedMessagingSenderId = messagingSenderId.trim();
    final normalizedAuthDomain = authDomain.trim();
    final normalizedStorageBucket = storageBucket.trim();
    return FirebaseRuntimeConfig(
      projectId: normalizedProjectId,
      apiKey: normalizedApiKey,
      appId: normalizedAppId,
      messagingSenderId: normalizedMessagingSenderId,
      authDomain: normalizedAuthDomain,
      storageBucket: normalizedStorageBucket,
      missingEnvironmentNames: [
        if (normalizedProjectId.isEmpty) projectIdEnvironmentName,
        if (normalizedApiKey.isEmpty) apiKeyEnvironmentName,
        if (normalizedAppId.isEmpty) appIdEnvironmentName,
        if (normalizedMessagingSenderId.isEmpty)
          messagingSenderIdEnvironmentName,
      ],
    );
  }
}

import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseRuntimeConfig {
  const SupabaseRuntimeConfig({
    required this.url,
    required this.publishableKey,
    required this.missingEnvironmentNames,
  });

  final String url;
  final String publishableKey;
  final List<String> missingEnvironmentNames;

  bool get isComplete => missingEnvironmentNames.isEmpty;
}

class SupabaseBootstrap {
  static const urlEnvironmentName = 'SUPABASE_URL';
  static const publishableKeyEnvironmentName = 'SUPABASE_PUBLISHABLE_KEY';
  static const legacyAnonKeyEnvironmentName = 'SUPABASE_ANON_KEY';

  static bool _initialized = false;
  static String? _initError;

  static bool get isInitialized => _initialized;
  static bool get isConfigured => _initialized && _initError == null;
  static String? get initError => _initError;

  static Future<void> init() async {
    final config = resolveConfig(
      url: const String.fromEnvironment(urlEnvironmentName),
      publishableKey: const String.fromEnvironment(
        publishableKeyEnvironmentName,
      ),
      legacyAnonKey: const String.fromEnvironment(legacyAnonKeyEnvironmentName),
    );
    if (!config.isComplete) {
      _initialized = false;
      _initError =
          'Supabase configuration is missing: '
          '${config.missingEnvironmentNames.join(', ')}. '
          'Rebuild or run CommandGlows with SUPABASE_URL and '
          'SUPABASE_PUBLISHABLE_KEY.';
      return;
    }

    // supabase_flutter 2.x still names this SDK parameter `anonKey`.
    // Supabase's current dashboard/docs call this value the publishable key.
    await Supabase.initialize(url: config.url, anonKey: config.publishableKey);
    _initialized = true;
    _initError = null;
  }

  static SupabaseRuntimeConfig resolveConfig({
    required String url,
    required String publishableKey,
    required String legacyAnonKey,
  }) {
    final normalizedUrl = url.trim();
    final normalizedPublishableKey = publishableKey.trim();
    final normalizedLegacyKey = legacyAnonKey.trim();
    final key = normalizedPublishableKey.isNotEmpty
        ? normalizedPublishableKey
        : normalizedLegacyKey;
    return SupabaseRuntimeConfig(
      url: normalizedUrl,
      publishableKey: key,
      missingEnvironmentNames: [
        if (normalizedUrl.isEmpty) urlEnvironmentName,
        if (key.isEmpty) publishableKeyEnvironmentName,
      ],
    );
  }
}

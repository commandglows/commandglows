class SuiteIdentityBridgeRuntimeConfig {
  const SuiteIdentityBridgeRuntimeConfig({
    required this.bridgeUri,
    required this.issue,
  });

  final Uri? bridgeUri;
  final String? issue;

  bool get isConfigured => bridgeUri != null;

  String get endpointLabel {
    final uri = bridgeUri;
    if (uri == null) {
      return 'unconfigured';
    }
    final portSuffix = uri.hasPort ? ':${uri.port}' : '';
    return '${uri.scheme}://${uri.host}$portSuffix';
  }
}

class SuiteIdentityBridgeBootstrap {
  static const bridgeUrlEnvironmentName = 'SUITE_IDENTITY_BRIDGE_URL';

  static SuiteIdentityBridgeRuntimeConfig get config {
    return resolveConfig(
      bridgeUrl: const String.fromEnvironment(bridgeUrlEnvironmentName),
    );
  }

  static SuiteIdentityBridgeRuntimeConfig resolveConfig({
    required String bridgeUrl,
  }) {
    final normalizedBridgeUrl = bridgeUrl.trim();
    if (normalizedBridgeUrl.isEmpty) {
      return const SuiteIdentityBridgeRuntimeConfig(
        bridgeUri: null,
        issue:
            'suite_identity_bridge_missing_env: '
            'SUITE_IDENTITY_BRIDGE_URL',
      );
    }

    final uri = Uri.tryParse(normalizedBridgeUrl);
    if (uri == null ||
        !uri.hasScheme ||
        uri.host.trim().isEmpty ||
        (uri.scheme != 'https' && uri.scheme != 'http')) {
      return const SuiteIdentityBridgeRuntimeConfig(
        bridgeUri: null,
        issue:
            'suite_identity_bridge_invalid_env: '
            'SUITE_IDENTITY_BRIDGE_URL must be an absolute http(s) URL',
      );
    }

    return SuiteIdentityBridgeRuntimeConfig(
      bridgeUri: uri.removeFragment(),
      issue: null,
    );
  }
}

import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/bootstrap/suite_identity_bridge_bootstrap.dart';
import '../domain/product_entitlement.dart';
import '../domain/suite_identity.dart';

typedef FirebaseIdTokenResolver = Future<String?> Function();

class SuiteIdentityBridgeClient {
  SuiteIdentityBridgeClient({http.Client? httpClient})
    : _httpClient = httpClient ?? http.Client();

  final http.Client _httpClient;

  Future<SuiteIdentitySnapshot> resolveFromFirebaseSession({
    required SuiteIdentityBridgeRuntimeConfig bridgeConfig,
    required SuiteIdentityAccount firebaseAccount,
    required FirebaseIdTokenResolver resolveIdToken,
  }) async {
    if (!bridgeConfig.isConfigured) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue:
            bridgeConfig.issue ?? 'suite_identity_bridge_missing_configuration',
      );
    }

    final idToken = await _resolveToken(resolveIdToken);
    if (idToken == null) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue: 'suite_identity_bridge_missing_firebase_token',
      );
    }

    final response = await _requestBridge(
      bridgeUri: bridgeConfig.bridgeUri!,
      idToken: idToken,
    );
    if (response == null) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue:
            'suite_identity_bridge_network_error'
            '(endpoint=${bridgeConfig.endpointLabel})',
      );
    }

    if (response.statusCode != 200) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue:
            'suite_identity_bridge_http_${response.statusCode}'
            '(endpoint=${bridgeConfig.endpointLabel})',
      );
    }

    final decoded = _decodeJsonObject(response.body);
    if (decoded == null) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue: 'suite_identity_bridge_invalid_json',
      );
    }

    final parsed = _parseSnapshot(decoded, fallbackAccount: firebaseAccount);
    if (parsed == null) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue: 'suite_identity_bridge_invalid_schema',
      );
    }

    return parsed;
  }

  Future<String?> _resolveToken(FirebaseIdTokenResolver resolveIdToken) async {
    try {
      final value = (await resolveIdToken())?.trim();
      if (value == null || value.isEmpty) {
        return null;
      }
      return value;
    } catch (_) {
      return null;
    }
  }

  Future<http.Response?> _requestBridge({
    required Uri bridgeUri,
    required String idToken,
  }) async {
    try {
      return await _httpClient.post(
        bridgeUri,
        headers: <String, String>{
          'Authorization': 'Bearer $idToken',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: '{}',
      );
    } catch (_) {
      return null;
    }
  }

  Map<String, Object?>? _decodeJsonObject(String rawBody) {
    try {
      final decoded = jsonDecode(rawBody);
      if (decoded is Map) {
        return Map<String, Object?>.from(decoded);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  SuiteIdentitySnapshot? _parseSnapshot(
    Map<String, Object?> payload, {
    required SuiteIdentityAccount fallbackAccount,
  }) {
    final status = _parseStatus(payload['status']);
    if (status == null) {
      return null;
    }

    final globalUserId = _parseNonEmptyString(payload['globalUserId']);

    final parsedAccounts = _parseAccounts(payload['accounts']);
    final accounts = parsedAccounts.isEmpty
        ? <SuiteIdentityAccount>[fallbackAccount]
        : parsedAccounts;
    final entitlements = _parseEntitlements(payload['entitlements']);

    return SuiteIdentitySnapshot(
      status: status,
      globalUserId: globalUserId,
      accounts: accounts,
      entitlements: entitlements,
      issue: null,
    );
  }

  SuiteAccountStatus? _parseStatus(Object? rawValue) {
    final value = _parseNonEmptyString(rawValue);
    if (value == null) {
      return null;
    }
    switch (value) {
      case 'ok':
        return SuiteAccountStatus.recognized;
      case 'unknown':
        return SuiteAccountStatus.unknown;
      case 'recognized':
        return SuiteAccountStatus.recognized;
      case 'linkingRequired':
      case 'linking_required':
        return SuiteAccountStatus.linkingRequired;
      case 'accessActive':
      case 'access_active':
        return SuiteAccountStatus.accessActive;
      case 'accessInactive':
      case 'access_inactive':
        return SuiteAccountStatus.accessInactive;
      case 'unavailable':
        return SuiteAccountStatus.unavailable;
      default:
        return null;
    }
  }

  List<SuiteIdentityAccount> _parseAccounts(Object? rawValue) {
    if (rawValue is! List) {
      return const [];
    }
    final accounts = <SuiteIdentityAccount>[];
    for (final entry in rawValue) {
      if (entry is! Map) {
        continue;
      }
      final normalized = Map<String, Object?>.from(entry);
      final providerRaw = _parseNonEmptyString(normalized['provider']);
      final providerUserId =
          _parseNonEmptyString(normalized['providerUserId']) ??
          _parseNonEmptyString(normalized['provider_user_id']);
      if (providerRaw == null || providerUserId == null) {
        continue;
      }
      final provider = _parseProvider(providerRaw);
      if (provider == null) {
        continue;
      }
      accounts.add(
        SuiteIdentityAccount(
          provider: provider,
          providerUserId: providerUserId,
          email: _parseNonEmptyString(normalized['email']),
        ),
      );
    }
    return accounts;
  }

  SuiteIdentityProvider? _parseProvider(String value) {
    switch (value) {
      case 'clerk':
        return SuiteIdentityProvider.clerk;
      case 'firebase':
        return SuiteIdentityProvider.firebase;
      case 'local':
        return SuiteIdentityProvider.local;
      default:
        return null;
    }
  }

  List<ProductEntitlement> _parseEntitlements(Object? rawValue) {
    if (rawValue is! List) {
      return const [];
    }
    final entitlements = <ProductEntitlement>[];
    for (final entry in rawValue) {
      if (entry is! Map) {
        continue;
      }
      final normalized = Map<String, Object?>.from(entry);
      final productRaw =
          _parseNonEmptyString(normalized['productId']) ??
          _parseNonEmptyString(normalized['product_id']);
      final statusRaw = _parseNonEmptyString(normalized['status']);
      if (productRaw == null || statusRaw == null) {
        continue;
      }
      final productId = ProductId.parse(productRaw);
      if (productId == null) {
        continue;
      }
      final status = _parseEntitlementStatus(statusRaw);
      if (status == null) {
        continue;
      }
      entitlements.add(
        ProductEntitlement(
          productId: productId,
          status: status,
          plan: _parseNonEmptyString(normalized['plan']),
          source: _parseNonEmptyString(normalized['source']),
          sourceRef:
              _parseNonEmptyString(normalized['sourceRef']) ??
              _parseNonEmptyString(normalized['source_ref']),
          environment: _parseNonEmptyString(normalized['environment']),
          updatedAt: _parseDateTime(
            _parseNonEmptyString(normalized['updatedAt']) ??
                _parseNonEmptyString(normalized['updated_at']),
          ),
        ),
      );
    }
    return entitlements;
  }

  ProductEntitlementStatus? _parseEntitlementStatus(String value) {
    switch (value) {
      case 'active':
        return ProductEntitlementStatus.active;
      case 'trialing':
        return ProductEntitlementStatus.trialing;
      case 'inactive':
        return ProductEntitlementStatus.inactive;
      case 'expired':
        return ProductEntitlementStatus.expired;
      case 'refunded':
        return ProductEntitlementStatus.refunded;
      case 'revoked':
        return ProductEntitlementStatus.revoked;
      case 'pendingReview':
      case 'pending_review':
        return ProductEntitlementStatus.pendingReview;
      default:
        return null;
    }
  }

  DateTime? _parseDateTime(String? value) {
    if (value == null) {
      return null;
    }
    return DateTime.tryParse(value)?.toUtc();
  }

  String? _parseNonEmptyString(Object? value) {
    if (value is! String) {
      return null;
    }
    final normalized = value.trim();
    if (normalized.isEmpty) {
      return null;
    }
    return normalized;
  }

  SuiteIdentitySnapshot _conservativeAccountSnapshot({
    required SuiteIdentityAccount account,
    required String issue,
  }) {
    return SuiteIdentitySnapshot(
      status: SuiteAccountStatus.recognized,
      globalUserId: null,
      accounts: [account],
      entitlements: const [],
      issue: issue,
    );
  }
}

import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import '../../../core/bootstrap/suite_identity_bridge_bootstrap.dart';
import '../domain/product_entitlement.dart';
import '../domain/suite_identity.dart';

typedef FirebaseIdTokenResolver = Future<String?> Function();

class SuiteIdentityBridgeClient {
  SuiteIdentityBridgeClient({http.Client? httpClient})
    : _httpClient = httpClient ?? http.Client();

  final http.Client _httpClient;
  static const _uuid = Uuid();
  static const _publicTrialReasonCodes = <String>{
    'installation_not_eligible',
    'previous_trial_exists',
    'trial_cycles_exhausted',
    'temporary_rate_limit',
    'active_paid_access',
  };
  static const _safeBridgeErrorCodes = <String>{
    'invalid_json',
    'bridge_secret_not_configured',
    'trial_installation_signal_unavailable',
    'firebase_admin_not_configured',
    'missing_bearer_token',
    'convex_not_configured',
    'invalid_firebase_token',
    'invalid_token_audience_issuer_or_subject',
    'invalid_bridge_snapshot',
    'bridge_write_failed',
    'firebase_identity_unavailable',
    'installation_id_required',
    'installation_id_invalid',
  };

  Future<Uri?> startStripeCheckout({
    required SuiteIdentityBridgeRuntimeConfig bridgeConfig,
    required String checkoutIdentityToken,
    String offerId = 'commandglows_app/power',
  }) async {
    final bridgeUri = bridgeConfig.bridgeUri;
    if (!bridgeConfig.isConfigured || bridgeUri == null) return null;
    final checkoutUri = bridgeUri.resolve('/api/commerce/checkout');
    try {
      final response = await _httpClient.post(
        checkoutUri,
        headers: const <String, String>{
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(<String, String>{
          'offerId': offerId,
          'provider': 'stripe',
          'source': 'commandglows-app',
          'sourceRef': 'trial-access-screen',
          'identityToken': checkoutIdentityToken,
          'successUrl': 'https://www.commandglows.com/purchase/success',
          'cancelUrl': 'https://www.commandglows.com/purchase/cancel',
        }),
      );
      if (response.statusCode != 200) return null;
      final payload = _decodeJsonObject(response.body);
      final checkoutUrl = _parseNonEmptyString(payload?['checkoutUrl']);
      return checkoutUrl == null ? null : Uri.tryParse(checkoutUrl);
    } catch (_) {
      return null;
    }
  }

  Future<SuiteIdentitySnapshot> resolveFromFirebaseSession({
    required SuiteIdentityBridgeRuntimeConfig bridgeConfig,
    required SuiteIdentityAccount firebaseAccount,
    required FirebaseIdTokenResolver resolveIdToken,
    String installationId = 'test-installation-id',
    bool requestTrialStart = false,
    bool requestTrialRestart = false,
  }) async {
    if (requestTrialStart && requestTrialRestart) {
      throw ArgumentError('Only one trial action can be requested at a time.');
    }
    final requestId = requestTrialStart ? _uuid.v4() : null;
    if (!bridgeConfig.isConfigured) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue:
            bridgeConfig.issue ?? 'suite_identity_bridge_missing_configuration',
        trialRequest: requestId == null
            ? null
            : TrialRequestResult(
                state: TrialRequestState.notSent,
                requestId: requestId,
              ),
      );
    }

    final idToken = await _resolveToken(resolveIdToken);
    if (idToken == null) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue: 'suite_identity_bridge_missing_firebase_token',
        trialRequest: requestId == null
            ? null
            : TrialRequestResult(
                state: TrialRequestState.notSent,
                requestId: requestId,
              ),
      );
    }

    final response = await _requestBridge(
      bridgeUri: bridgeConfig.bridgeUri!,
      idToken: idToken,
      installationId: installationId,
      trialAction: requestTrialStart
          ? 'start'
          : requestTrialRestart
          ? 'restart'
          : null,
      requestId: requestId,
    );
    if (response == null) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue:
            'suite_identity_bridge_network_error'
            '(endpoint=${bridgeConfig.endpointLabel})',
        trialRequest: requestId == null
            ? null
            : TrialRequestResult(
                state: TrialRequestState.noResponse,
                requestId: requestId,
              ),
      );
    }

    if (response.statusCode != 200) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue:
            'suite_identity_bridge_http_${response.statusCode}'
            '(endpoint=${bridgeConfig.endpointLabel})',
        trialRequest: requestId == null
            ? null
            : TrialRequestResult(
                state: TrialRequestState.httpError,
                requestId: requestId,
                httpStatus: response.statusCode,
                machineErrorCode: _safeMachineError(response.body),
              ),
      );
    }

    final decoded = _decodeJsonObject(response.body);
    if (decoded == null) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue: 'suite_identity_bridge_invalid_json',
        trialRequest: requestId == null
            ? null
            : TrialRequestResult(
                state: TrialRequestState.responseUnknown,
                requestId: requestId,
                httpStatus: response.statusCode,
              ),
      );
    }

    final parsed = _parseSnapshot(decoded, fallbackAccount: firebaseAccount);
    if (parsed == null) {
      return _conservativeAccountSnapshot(
        account: firebaseAccount,
        issue: 'suite_identity_bridge_invalid_schema',
        trialRequest: requestId == null
            ? null
            : TrialRequestResult(
                state: TrialRequestState.responseUnknown,
                requestId: requestId,
                httpStatus: response.statusCode,
              ),
      );
    }

    if (requestId == null) return parsed;
    return _withTrialRequest(
      parsed,
      _parseTrialRequest(decoded['trialRequest'], requestId, response),
    );
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
    required String installationId,
    required String? trialAction,
    required String? requestId,
  }) async {
    try {
      final headers = <String, String>{
        'Authorization': 'Bearer $idToken',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CommandGlows-Installation-Id': installationId,
      };
      if (requestId != null) {
        headers['X-CommandGlows-Request-Id'] = requestId;
      }
      return await _httpClient.post(
        bridgeUri,
        headers: headers,
        body: trialAction == null
            ? '{}'
            : jsonEncode(<String, String>{'trialAction': trialAction}),
      );
    } catch (_) {
      return null;
    }
  }

  TrialRequestResult _parseTrialRequest(
    Object? rawValue,
    String requestId,
    http.Response response,
  ) {
    final responseTrial = rawValue is Map
        ? Map<String, Object?>.from(rawValue)
        : null;
    final bodyRequestId = _parseNonEmptyString(responseTrial?['requestId']);
    final headerRequestId = _parseNonEmptyString(
      response.headers['x-commandglows-request-id'],
    );
    if (responseTrial == null ||
        (bodyRequestId != requestId && headerRequestId != requestId)) {
      return TrialRequestResult(
        state: TrialRequestState.responseUnknown,
        requestId: requestId,
        httpStatus: response.statusCode,
      );
    }
    final trial = responseTrial;
    final outcome = _parseNonEmptyString(trial['outcome']);
    final reason = _parseNonEmptyString(trial['reasonCode']);
    final state = switch (outcome) {
      'granted' => TrialRequestState.granted,
      'already_active' => TrialRequestState.alreadyActive,
      'denied'
          when reason != null && _publicTrialReasonCodes.contains(reason) =>
        TrialRequestState.denied,
      _ => TrialRequestState.responseUnknown,
    };
    return TrialRequestResult(
      state: state,
      requestId: requestId,
      httpStatus: response.statusCode,
      reasonCode: state == TrialRequestState.denied ? reason : null,
    );
  }

  String? _safeMachineError(String rawBody) {
    final payload = _decodeJsonObject(rawBody);
    if (payload == null) return null;
    for (final field in const ['errorCode', 'error', 'code']) {
      final value = _parseNonEmptyString(payload[field]);
      if (value != null && _safeBridgeErrorCodes.contains(value)) return value;
    }
    return null;
  }

  SuiteIdentitySnapshot _withTrialRequest(
    SuiteIdentitySnapshot snapshot,
    TrialRequestResult result,
  ) => SuiteIdentitySnapshot(
    status: snapshot.status,
    globalUserId: snapshot.globalUserId,
    checkoutIdentityToken: snapshot.checkoutIdentityToken,
    accounts: snapshot.accounts,
    entitlements: snapshot.entitlements,
    issue: snapshot.issue,
    trialRequest: result,
  );

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
    final checkoutIdentityToken = _parseNonEmptyString(
      payload['checkoutIdentityToken'],
    );

    final parsedAccounts = _parseAccounts(payload['accounts']);
    final accounts = parsedAccounts.isEmpty
        ? <SuiteIdentityAccount>[fallbackAccount]
        : parsedAccounts;
    final entitlements = _parseEntitlements(payload['entitlements']);

    return SuiteIdentitySnapshot(
      status: status,
      globalUserId: globalUserId,
      checkoutIdentityToken: checkoutIdentityToken,
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
          trialStartedAt: _parseDateTime(
            normalized['trialStartedAt'] ?? normalized['trial_started_at'],
          ),
          trialExpiresAt: _parseDateTime(
            normalized['trialExpiresAt'] ?? normalized['trial_expires_at'],
          ),
          trialAttempt: _parseInteger(
            normalized['trialAttempt'] ?? normalized['trial_attempt'],
          ),
          trialRestartsRemaining: _parseInteger(
            normalized['trialRestartsRemaining'] ??
                normalized['trial_restarts_remaining'],
          ),
          trialRestartEligible:
              normalized['trialRestartEligible'] == true ||
              normalized['trial_restart_eligible'] == true,
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

  DateTime? _parseDateTime(Object? value) {
    if (value == null) {
      return null;
    }
    if (value is num) {
      return DateTime.fromMillisecondsSinceEpoch(value.toInt(), isUtc: true);
    }
    if (value is! String) {
      return null;
    }
    return DateTime.tryParse(value)?.toUtc();
  }

  int? _parseInteger(Object? value) {
    if (value is num) {
      return value.toInt();
    }
    if (value is String) {
      return int.tryParse(value);
    }
    return null;
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
    TrialRequestResult? trialRequest,
  }) {
    return SuiteIdentitySnapshot(
      status: SuiteAccountStatus.recognized,
      globalUserId: null,
      accounts: [account],
      entitlements: const [],
      issue: issue,
      trialRequest: trialRequest,
    );
  }
}

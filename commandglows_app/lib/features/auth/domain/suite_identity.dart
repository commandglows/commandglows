import 'product_entitlement.dart';

enum SuiteIdentityProvider { clerk, firebase, local }

enum SuiteAccountStatus {
  unknown,
  recognized,
  linkingRequired,
  accessActive,
  accessInactive,
  unavailable,
}

class SuiteIdentityAccount {
  const SuiteIdentityAccount({
    required this.provider,
    required this.providerUserId,
    this.email,
  });

  final SuiteIdentityProvider provider;
  final String providerUserId;
  final String? email;
}

class SuiteIdentitySnapshot {
  const SuiteIdentitySnapshot({
    required this.status,
    this.globalUserId,
    this.accounts = const [],
    this.entitlements = const [],
    this.issue,
  });

  const SuiteIdentitySnapshot.unavailable([this.issue])
    : status = SuiteAccountStatus.unavailable,
      globalUserId = null,
      accounts = const [],
      entitlements = const [];

  final SuiteAccountStatus status;
  final String? globalUserId;
  final List<SuiteIdentityAccount> accounts;
  final List<ProductEntitlement> entitlements;
  final String? issue;

  bool hasAccessTo(ProductId productId) {
    return entitlements.any(
      (entitlement) =>
          entitlement.productId == productId && entitlement.grantsAccess,
    );
  }

  SuiteAccountStatus statusFor(ProductId productId) {
    if (status == SuiteAccountStatus.unavailable ||
        status == SuiteAccountStatus.linkingRequired) {
      return status;
    }
    if (globalUserId == null) {
      return status == SuiteAccountStatus.unknown
          ? SuiteAccountStatus.unknown
          : SuiteAccountStatus.accessInactive;
    }
    return hasAccessTo(productId)
        ? SuiteAccountStatus.accessActive
        : SuiteAccountStatus.accessInactive;
  }
}

extension SuiteIdentityAccountDiagnostics on SuiteIdentityAccount {
  String get maskedProviderUserId {
    final value = providerUserId.trim();
    if (value.isEmpty) {
      return 'none';
    }
    if (value.length <= 4) {
      return '${value[0]}***';
    }
    return '${value.substring(0, 3)}...${value.substring(value.length - 3)}';
  }

  String get supportLabel {
    return '${provider.name}:$maskedProviderUserId';
  }
}

extension SuiteIdentitySnapshotDiagnostics on SuiteIdentitySnapshot {
  String get supportSummary {
    final issueLabel = _diagnosticIssue(issue);
    final accountLabels = accounts
        .map((account) => account.supportLabel)
        .join(',');
    final accountSummary = accounts.isEmpty ? 'none' : '[$accountLabels]';
    final globalLabel = globalUserId == null
        ? 'globalUserId:missing'
        : 'globalUserId:present';
    return 'status=${status.name}; $globalLabel; accounts=$accountSummary; '
        'entitlements=${entitlements.length}; issue=$issueLabel';
  }

  String _diagnosticIssue(String? rawIssue) {
    if (rawIssue == null || rawIssue.trim().isEmpty) {
      return 'none';
    }
    return rawIssue
        .replaceAll(
          RegExp(r'Bearer\s+[0-9A-Za-z_.-]{12,}', caseSensitive: false),
          '<redacted>',
        )
        .replaceAll(RegExp(r'eyJ[0-9A-Za-z_.-]{20,}'), '<redacted>')
        .replaceAll('\n', ' | ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }
}

import 'dart:convert';

import 'package:crypto/crypto.dart';

enum LocalCloudSyncDomain { clipboard, snippets, dictionary, settings, voice }

enum LocalCloudSyncCategoryState {
  unavailable,
  localOnly,
  blocked,
  pending,
  syncing,
  synced,
  conflict,
  failed,
}

enum LocalCloudSyncDecisionKind {
  none,
  seedCloudFromLocal,
  hydrateLocalFromCloud,
  mergeLocalIntoCloud,
  confirmationRequired,
  blockedDifferentAccount,
  pendingRetry,
  localOnlyNotPromotable,
}

enum LocalCloudSyncQueueEntryState { pending, failed }

enum LocalCloudSyncControllerStatus { idle, syncing, ready, failed }

class LocalCloudSyncAuthContext {
  const LocalCloudSyncAuthContext({
    required this.isSignedIn,
    required this.isLocalFallback,
    required this.hasEntitlement,
    required this.firebaseUid,
    required this.globalUserId,
    this.signupFlow = false,
  });

  final bool isSignedIn;
  final bool isLocalFallback;
  final bool hasEntitlement;
  final String? firebaseUid;
  final String? globalUserId;
  final bool signupFlow;

  bool get remoteSyncActive =>
      isSignedIn &&
      !isLocalFallback &&
      hasEntitlement &&
      (firebaseUid?.trim().isNotEmpty ?? false) &&
      (globalUserId?.trim().isNotEmpty ?? false);
}

class LocalCloudDomainSnapshot {
  const LocalCloudDomainSnapshot({
    required this.domain,
    required this.supportsPromotion,
    required this.items,
    required this.checksum,
    this.deletedKeys = const <String>{},
  });

  final LocalCloudSyncDomain domain;
  final bool supportsPromotion;
  final List<Map<String, Object?>> items;
  final String checksum;
  final Set<String> deletedKeys;

  int get count => items.length;

  bool get isEmpty => items.isEmpty;

  static LocalCloudDomainSnapshot empty(
    LocalCloudSyncDomain domain, {
    required bool supportsPromotion,
  }) {
    return LocalCloudDomainSnapshot(
      domain: domain,
      supportsPromotion: supportsPromotion,
      items: const <Map<String, Object?>>[],
      checksum: _computeChecksum(const <Map<String, Object?>>[]),
    );
  }

  static String checksumFor(List<Map<String, Object?>> items) {
    return _computeChecksum(items);
  }

  static String _computeChecksum(List<Map<String, Object?>> items) {
    final canonical = jsonEncode(_canonicalize(items));
    return sha256.convert(utf8.encode(canonical)).toString();
  }

  static Object? _canonicalize(Object? value) {
    if (value is Map) {
      final entries = value.entries.toList()
        ..sort((a, b) => a.key.toString().compareTo(b.key.toString()));
      final next = <String, Object?>{};
      for (final entry in entries) {
        next[entry.key.toString()] = _canonicalize(entry.value);
      }
      return next;
    }
    if (value is List) {
      return value.map(_canonicalize).toList(growable: false);
    }
    return value;
  }
}

class LocalCloudDomainConflict {
  const LocalCloudDomainConflict({
    required this.domain,
    required this.key,
    required this.reason,
  });

  final LocalCloudSyncDomain domain;
  final String key;
  final String reason;
}

class LocalCloudDomainStatus {
  const LocalCloudDomainStatus({
    required this.domain,
    required this.state,
    required this.decision,
    required this.detail,
    required this.localCount,
    required this.cloudCount,
    required this.pendingOperations,
    this.lastSyncedAt,
    this.conflicts = const <LocalCloudDomainConflict>[],
  });

  const LocalCloudDomainStatus.initial(LocalCloudSyncDomain domain)
    : this(
        domain: domain,
        state: LocalCloudSyncCategoryState.localOnly,
        decision: LocalCloudSyncDecisionKind.none,
        detail: 'Local uniquement.',
        localCount: 0,
        cloudCount: 0,
        pendingOperations: 0,
      );

  final LocalCloudSyncDomain domain;
  final LocalCloudSyncCategoryState state;
  final LocalCloudSyncDecisionKind decision;
  final String detail;
  final int localCount;
  final int cloudCount;
  final int pendingOperations;
  final DateTime? lastSyncedAt;
  final List<LocalCloudDomainConflict> conflicts;
}

class LocalCloudSyncState {
  const LocalCloudSyncState({
    required this.status,
    required this.domains,
    this.issueCode,
    this.issueMessage,
    this.lastRunAt,
  });

  factory LocalCloudSyncState.initial() {
    return LocalCloudSyncState(
      status: LocalCloudSyncControllerStatus.idle,
      domains: {
        for (final domain in LocalCloudSyncDomain.values)
          domain: LocalCloudDomainStatus.initial(domain),
      },
    );
  }

  final LocalCloudSyncControllerStatus status;
  final Map<LocalCloudSyncDomain, LocalCloudDomainStatus> domains;
  final String? issueCode;
  final String? issueMessage;
  final DateTime? lastRunAt;

  bool get hasPendingQueue =>
      domains.values.any((status) => status.pendingOperations > 0);

  LocalCloudSyncState copyWith({
    LocalCloudSyncControllerStatus? status,
    Map<LocalCloudSyncDomain, LocalCloudDomainStatus>? domains,
    String? issueCode,
    String? issueMessage,
    DateTime? lastRunAt,
  }) {
    return LocalCloudSyncState(
      status: status ?? this.status,
      domains: domains ?? this.domains,
      issueCode: issueCode,
      issueMessage: issueMessage,
      lastRunAt: lastRunAt ?? this.lastRunAt,
    );
  }
}

class LocalCloudSyncMetadata {
  const LocalCloudSyncMetadata({
    this.rememberedFirebaseUid,
    this.rememberedGlobalUserId,
    this.lastPromotedAtUtc,
    this.domainChecksums = const <String, String>{},
  });

  final String? rememberedFirebaseUid;
  final String? rememberedGlobalUserId;
  final DateTime? lastPromotedAtUtc;
  final Map<String, String> domainChecksums;

  LocalCloudSyncMetadata copyWith({
    String? rememberedFirebaseUid,
    String? rememberedGlobalUserId,
    DateTime? lastPromotedAtUtc,
    Map<String, String>? domainChecksums,
  }) {
    return LocalCloudSyncMetadata(
      rememberedFirebaseUid:
          rememberedFirebaseUid ?? this.rememberedFirebaseUid,
      rememberedGlobalUserId:
          rememberedGlobalUserId ?? this.rememberedGlobalUserId,
      lastPromotedAtUtc: lastPromotedAtUtc ?? this.lastPromotedAtUtc,
      domainChecksums: domainChecksums ?? this.domainChecksums,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'rememberedFirebaseUid': rememberedFirebaseUid,
      'rememberedGlobalUserId': rememberedGlobalUserId,
      'lastPromotedAtUtc': lastPromotedAtUtc?.toUtc().toIso8601String(),
      'domainChecksums': domainChecksums,
    };
  }

  static LocalCloudSyncMetadata fromMap(Map<Object?, Object?> raw) {
    final checksumsRaw = raw['domainChecksums'];
    final checksums = checksumsRaw is Map
        ? checksumsRaw.map(
            (key, value) => MapEntry(key.toString(), (value ?? '').toString()),
          )
        : const <String, String>{};
    return LocalCloudSyncMetadata(
      rememberedFirebaseUid: _stringOrNull(raw['rememberedFirebaseUid']),
      rememberedGlobalUserId: _stringOrNull(raw['rememberedGlobalUserId']),
      lastPromotedAtUtc: _dateOrNull(raw['lastPromotedAtUtc']),
      domainChecksums: checksums,
    );
  }
}

class LocalCloudSyncQueueEntry {
  const LocalCloudSyncQueueEntry({
    required this.operationKey,
    required this.domain,
    required this.targetFirebaseUid,
    required this.targetGlobalUserId,
    required this.attempts,
    required this.retryAfterUtc,
    required this.state,
    required this.createdAtUtc,
    required this.updatedAtUtc,
    this.lastErrorCode,
    this.lastErrorMessage,
  });

  final String operationKey;
  final LocalCloudSyncDomain domain;
  final String targetFirebaseUid;
  final String targetGlobalUserId;
  final int attempts;
  final DateTime retryAfterUtc;
  final LocalCloudSyncQueueEntryState state;
  final DateTime createdAtUtc;
  final DateTime updatedAtUtc;
  final String? lastErrorCode;
  final String? lastErrorMessage;

  bool isFlushReady(DateTime now) => !retryAfterUtc.isAfter(now.toUtc());

  LocalCloudSyncQueueEntry copyWith({
    int? attempts,
    DateTime? retryAfterUtc,
    LocalCloudSyncQueueEntryState? state,
    DateTime? updatedAtUtc,
    String? lastErrorCode,
    String? lastErrorMessage,
  }) {
    return LocalCloudSyncQueueEntry(
      operationKey: operationKey,
      domain: domain,
      targetFirebaseUid: targetFirebaseUid,
      targetGlobalUserId: targetGlobalUserId,
      attempts: attempts ?? this.attempts,
      retryAfterUtc: retryAfterUtc ?? this.retryAfterUtc,
      state: state ?? this.state,
      createdAtUtc: createdAtUtc,
      updatedAtUtc: updatedAtUtc ?? this.updatedAtUtc,
      lastErrorCode: lastErrorCode,
      lastErrorMessage: lastErrorMessage,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'operationKey': operationKey,
      'domain': domain.name,
      'targetFirebaseUid': targetFirebaseUid,
      'targetGlobalUserId': targetGlobalUserId,
      'attempts': attempts,
      'retryAfterUtc': retryAfterUtc.toUtc().toIso8601String(),
      'state': state.name,
      'createdAtUtc': createdAtUtc.toUtc().toIso8601String(),
      'updatedAtUtc': updatedAtUtc.toUtc().toIso8601String(),
      'lastErrorCode': lastErrorCode,
      'lastErrorMessage': lastErrorMessage,
    };
  }

  static LocalCloudSyncQueueEntry? fromMap(Map<Object?, Object?> raw) {
    final operationKey = _stringOrNull(raw['operationKey']);
    final firebaseUid = _stringOrNull(raw['targetFirebaseUid']);
    final globalUserId = _stringOrNull(raw['targetGlobalUserId']);
    final domainName = _stringOrNull(raw['domain']);
    final stateName = _stringOrNull(raw['state']);
    if (operationKey == null ||
        operationKey.isEmpty ||
        firebaseUid == null ||
        firebaseUid.isEmpty ||
        globalUserId == null ||
        globalUserId.isEmpty ||
        domainName == null ||
        stateName == null) {
      return null;
    }
    final domain = LocalCloudSyncDomain.values.firstWhere(
      (value) => value.name == domainName,
      orElse: () => LocalCloudSyncDomain.settings,
    );
    final state = LocalCloudSyncQueueEntryState.values.firstWhere(
      (value) => value.name == stateName,
      orElse: () => LocalCloudSyncQueueEntryState.failed,
    );
    return LocalCloudSyncQueueEntry(
      operationKey: operationKey,
      domain: domain,
      targetFirebaseUid: firebaseUid,
      targetGlobalUserId: globalUserId,
      attempts: _intOrZero(raw['attempts']),
      retryAfterUtc:
          _dateOrNull(raw['retryAfterUtc']) ??
          DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      state: state,
      createdAtUtc:
          _dateOrNull(raw['createdAtUtc']) ??
          DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      updatedAtUtc:
          _dateOrNull(raw['updatedAtUtc']) ??
          DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      lastErrorCode: _stringOrNull(raw['lastErrorCode']),
      lastErrorMessage: _stringOrNull(raw['lastErrorMessage']),
    );
  }

  static int _intOrZero(Object? value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    return 0;
  }
}

String? _stringOrNull(Object? value) {
  if (value is! String) {
    return null;
  }
  final normalized = value.trim();
  return normalized.isEmpty ? null : normalized;
}

DateTime? _dateOrNull(Object? value) {
  if (value is! String) {
    return null;
  }
  return DateTime.tryParse(value)?.toUtc();
}

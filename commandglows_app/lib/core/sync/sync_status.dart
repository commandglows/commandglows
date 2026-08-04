enum SyncHealth { localOnly, unavailable, pending, syncing, synced, failed }

class SyncIssue {
  const SyncIssue({
    required this.code,
    required this.message,
    required this.occurredAt,
    this.retryable = true,
  });

  final String code;
  final String message;
  final DateTime occurredAt;
  final bool retryable;
}

class SyncStatus {
  const SyncStatus({required this.health, this.lastSyncedAt, this.issue});

  const SyncStatus.localOnly()
    : health = SyncHealth.localOnly,
      lastSyncedAt = null,
      issue = null;

  const SyncStatus.unavailable([this.issue])
    : health = SyncHealth.unavailable,
      lastSyncedAt = null;

  final SyncHealth health;
  final DateTime? lastSyncedAt;
  final SyncIssue? issue;

  bool get canUseLocalFallback =>
      health == SyncHealth.localOnly || health == SyncHealth.unavailable;
}

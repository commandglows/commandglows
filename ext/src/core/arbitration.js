const DEFAULT_LEASE_MS = 15_000;

export function createRequestId(now = Date.now(), random = Math.random()) {
  const randomPart = Math.floor(random * Number.MAX_SAFE_INTEGER).toString(36);
  return `cmdglows-${now.toString(36)}-${randomPart}`;
}

export function createOwnershipLease({
  requestId,
  owner,
  now = Date.now(),
  leaseMs = DEFAULT_LEASE_MS,
}) {
  if (!requestId || !owner) {
    throw new TypeError('requestId and owner are required');
  }
  return {
    requestId,
    owner,
    acquiredAt: now,
    expiresAt: now + leaseMs,
  };
}

export function canAcquireOwnership(existingLease, requestId, now = Date.now()) {
  if (!existingLease) return true;
  if (existingLease.requestId === requestId) return false;
  return existingLease.expiresAt <= now;
}

export function preferredShortcutOwner({ extensionInstalled, windowsInstalled }) {
  if (windowsInstalled) return 'windows';
  if (extensionInstalled) return 'extension';
  return 'none';
}

export function executionOwner({
  shortcutOwner,
  chromeFocused,
  extensionReady,
  tabSupported,
}) {
  if (
    shortcutOwner === 'windows' &&
    chromeFocused &&
    extensionReady &&
    tabSupported
  ) {
    return 'extension';
  }
  return shortcutOwner;
}

export const SyncMode = Object.freeze({
  localOnly: 'local_only',
  commandglowsAccount: 'commandglows_account',
});

export function syncStatus({ authenticated = false, adapterReady = false } = {}) {
  if (authenticated && adapterReady) {
    return {
      mode: SyncMode.commandglowsAccount,
      writable: true,
      message: 'CommandGlows account sync is ready.',
    };
  }
  return {
    mode: SyncMode.localOnly,
    writable: true,
    message: 'Saved locally. CommandGlows account sync is not connected yet.',
  };
}

export function createSyncEnvelope({ userId, deviceId, snippets, now = Date.now() }) {
  if (!userId || !deviceId) throw new TypeError('userId and deviceId are required');
  return {
    schemaVersion: 1,
    userId,
    deviceId,
    generatedAt: now,
    snippets: snippets.map(({ id, trigger, content, updatedAt }) => ({
      id,
      trigger,
      content,
      updatedAt,
    })),
  };
}

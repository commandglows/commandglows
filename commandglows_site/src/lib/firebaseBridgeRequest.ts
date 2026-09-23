export type FirebaseBridgeRequest = {
  trialAction?: 'start' | 'restart';
};

export function parseFirebaseBridgeRequest(value: unknown): FirebaseBridgeRequest {
  if (!value || typeof value !== 'object') return {};
  const trialAction = (value as Record<string, unknown>).trialAction;
  return trialAction === 'start' || trialAction === 'restart'
    ? { trialAction }
    : {};
}

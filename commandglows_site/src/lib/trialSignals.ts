import { createHmac } from 'node:crypto'

/**
 * Applies the server-only pseudonymization layer before a client-derived trial
 * signal crosses into the canonical Convex ledger.
 */
export function pseudonymizeCommunityTrialSignal(
  clientSignal: string,
  secret: string,
  purpose: 'installation' | 'network'
): string {
  const normalizedSignal = clientSignal.trim()
  const normalizedSecret = secret.trim()
  if (!normalizedSignal || !normalizedSecret) {
    throw new Error('trial_signal_not_configured')
  }
  return createHmac('sha256', normalizedSecret)
    .update(`communityglows:${purpose}:${normalizedSignal}`)
    .digest('hex')
}

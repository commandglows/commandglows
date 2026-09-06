import type { AccountIdentityAdapter } from './accountIdentity'

type IdentityLookup = (clerkId: string) => Promise<unknown>

/** Transitional adapter; Clerk identifiers never leave this boundary. */
export function clerkAccountIdentityAdapter(
  verifiedUserId: string | null | undefined,
  lookup: IdentityLookup,
): AccountIdentityAdapter {
  return {
    async resolveAccount() {
      if (!verifiedUserId) return null
      const value = await lookup(verifiedUserId)
      if (!value || typeof value !== 'object' || !('globalUserId' in value)) {
        return null
      }
      const globalUserId = value.globalUserId
      if (typeof globalUserId !== 'string' || !globalUserId.trim()) return null
      return { globalUserId }
    },
  }
}

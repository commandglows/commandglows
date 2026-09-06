/** Product-facing identity. Authentication alone never implies a paid entitlement. */
export interface AccountIdentity {
  globalUserId: string
}

/** Implementations accept only a session verified by their provider middleware. */
export interface AccountIdentityAdapter {
  resolveAccount(): Promise<AccountIdentity | null>
}

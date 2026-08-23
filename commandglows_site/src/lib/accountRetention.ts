import { createHmac } from 'node:crypto'

function keyedDigest(value: string, secret: string, purpose: string) {
  const normalizedSecret = secret.trim()
  if (!normalizedSecret) {
    throw new Error('account_retention_secret_not_configured')
  }

  return createHmac('sha256', normalizedSecret)
    .update(`${purpose}:${value.trim().toLowerCase()}`)
    .digest('hex')
}

export function digestRetainedEmail(email: string, secret: string) {
  return keyedDigest(email, secret, 'communityglows-retained-email-v1')
}

export function digestDeletedProviderAccountId(
  providerAccountId: string,
  secret: string
) {
  return keyedDigest(
    providerAccountId,
    secret,
    'communityglows-deleted-provider-account-v1'
  )
}

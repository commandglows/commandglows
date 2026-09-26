import { getCommerceOffer } from './offers'

export type StripeBusiness = 'commandglows' | 'communityglows' | 'replayglows' | 'contentglows'
export const STRIPE_BUSINESSES: readonly StripeBusiness[] = ['commandglows', 'communityglows', 'replayglows', 'contentglows']
type ServerEnv = Record<string, string | undefined>

const accountId = (value: string | undefined) => value?.trim().match(/^acct_[A-Za-z0-9]+$/)?.[0]
const present = (value: string | undefined) => value?.trim() || undefined

export function businessForOffer(offerId: string): StripeBusiness | null {
  const productId = getCommerceOffer(offerId)?.productId
  if (productId === 'communityglows') return 'communityglows'
  if (productId === 'commandglows_app' || productId === 'commandglows_formation') return 'commandglows'
  if (productId === 'replayglows') return 'replayglows'
  if (productId === 'contentglowz') return 'contentglows'
  return null
}

export function stripeMerchant(business: StripeBusiness, env: ServerEnv) {
  const prefix = `STRIPE_${business.toUpperCase()}`
  const account = accountId(env[`${prefix}_ACCOUNT_ID`])
  if (account && STRIPE_BUSINESSES.some((other) => other !== business &&
    accountId(env[`STRIPE_${other.toUpperCase()}_ACCOUNT_ID`]) === account)) return null
  const secretKey = present(business === 'commandglows' ? env.STRIPE_SECRET_KEY : env[`${prefix}_SECRET_KEY`])
  const webhookSecret = present(business === 'commandglows' ? env.STRIPE_WEBHOOK_SECRET : env[`${prefix}_WEBHOOK_SECRET`])
  return account && secretKey ? { business, accountId: account, secretKey, webhookSecret,
    apiVersion: present(env.STRIPE_API_VERSION) } : null
}

export function stripeMerchantForOffer(offerId: string, env: ServerEnv) {
  const business = businessForOffer(offerId)
  return business ? stripeMerchant(business, env) : null
}

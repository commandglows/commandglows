const definitiveReasons = new Set([
  'provider_rate_limited',
  'provider_rejected',
  'recipient_inactive',
  'transport_not_enabled',
  'invalid_transport_message',
])

export type SettlementProofInput = {
  secret: string | undefined
  businessId: string
  messageId: string
  attemptId: string
  outcome: 'retryable_failure' | 'permanent_failure'
  reasonCode: string | undefined
  issuedAt: number
}

function payload(input: SettlementProofInput) {
  return JSON.stringify([
    'email-settlement-v1',
    input.businessId,
    input.messageId,
    input.attemptId,
    input.outcome,
    input.reasonCode,
    input.issuedAt,
  ])
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join(
    ''
  )
}

export async function signSettlementProof(input: SettlementProofInput) {
  if (
    !input.secret ||
    input.secret.length < 32 ||
    !input.reasonCode ||
    !definitiveReasons.has(input.reasonCode)
  )
    throw new Error('settlement_proof_unavailable')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(input.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload(input))
  )
  return hex(new Uint8Array(signature))
}

export async function verifySettlementProof(
  input: SettlementProofInput & { proof: string | undefined },
  now = Date.now()
) {
  if (
    !input.secret ||
    input.secret.length < 32 ||
    !input.proof ||
    !/^[a-f0-9]{64}$/.test(input.proof) ||
    !Number.isSafeInteger(input.issuedAt) ||
    input.issuedAt > now + 30_000 ||
    now - input.issuedAt > 300_000 ||
    !input.reasonCode ||
    !definitiveReasons.has(input.reasonCode)
  )
    return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(input.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const signature = Uint8Array.from(input.proof.match(/.{2}/g)!, (pair) =>
    parseInt(pair, 16)
  )
  return crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    new TextEncoder().encode(payload(input))
  )
}

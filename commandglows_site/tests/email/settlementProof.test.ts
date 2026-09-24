import {
  signSettlementProof,
  verifySettlementProof,
} from '../../src/lib/email/central/settlementProof'

const secret = 'test-settlement-secret-with-at-least-32-bytes'
const input = {
  secret,
  businessId: 'studio',
  messageId: 'message-1',
  attemptId: 'attempt-1',
  outcome: 'permanent_failure' as const,
  reasonCode: 'provider_rejected',
  issuedAt: 1_800_000_000_000,
}

test('settlement proof binds the definitive outcome and all dispatch identifiers', async () => {
  const proof = await signSettlementProof(input)
  expect(await verifySettlementProof({ ...input, proof }, input.issuedAt)).toBe(
    true
  )
  expect(
    await verifySettlementProof(
      { ...input, proof, messageId: 'other' },
      input.issuedAt
    )
  ).toBe(false)
  expect(
    await verifySettlementProof(
      { ...input, proof, outcome: 'retryable_failure' },
      input.issuedAt
    )
  ).toBe(false)
  expect(
    await verifySettlementProof(
      { ...input, proof, reasonCode: 'unknown' },
      input.issuedAt
    )
  ).toBe(false)
})

test('settlement proof expires and refuses an unapproved reason', async () => {
  const proof = await signSettlementProof(input)
  expect(
    await verifySettlementProof({ ...input, proof }, input.issuedAt + 300_001)
  ).toBe(false)
  await expect(
    signSettlementProof({
      ...input,
      reasonCode: 'provider_submission_uncertain',
    })
  ).rejects.toThrow('settlement_proof_unavailable')
})

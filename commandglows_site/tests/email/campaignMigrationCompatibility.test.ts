import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')
const readRef = makeFunctionReference<'query'>('emailCampaigns:read')
const credential = 'campaign-migration-fixture-credential'

function setup() {
  process.env.EMAIL_TEST_CAMPAIGNS = credential
  process.env.EMAIL_CONTROL_CONFIG = JSON.stringify({
    environment: 'sandbox',
    clients: [
      {
        id: 'migration-fixture',
        credentialEnv: 'EMAIL_TEST_CAMPAIGNS',
        businessIds: ['migration-fixture'],
        operations: ['campaign_read'],
      },
    ],
    businesses: [
      {
        id: 'migration-fixture',
        brand: 'Fixture',
        legalFooter: 'Fixture only',
        from: 'fixture@example.test',
        transactionalStream: 'service',
        broadcastStream: 'news',
        activated: false,
        allowedRecipients: [],
        audiences: [],
      },
    ],
  })
  return convexTest(schema, modules)
}

it('reads legacy rows and preserves core campaign state through schema rollback', async () => {
  const t = setup()
  const now = Date.now()
  const campaignId = await t.run((ctx: any) =>
    ctx.db.insert('emailCampaigns', {
      businessId: 'migration-fixture',
      revision: 2,
      state: 'draft',
      snapshotComplete: false,
      scanned: 0,
      eligible: 0,
      excluded: 0,
      fanoutQueued: 0,
      fanoutExcluded: 0,
      nextAt: now,
      createdAt: now,
      updatedAt: now,
    })
  )

  const read = () =>
    t.query(readRef, {
      credential,
      businessId: 'migration-fixture',
      view: 'list',
      paginationOpts: { numItems: 10, cursor: null },
    })
  const legacy = await read()
  expect(legacy.page[0].campaign).toMatchObject({
    id: campaignId,
    version: 2,
    state: 'draft',
    counters: { queued: 0, delivered: 0, submitted: 0, failed: 0, unknown: 0 },
  })

  await t.run((ctx: any) =>
    ctx.db.patch(campaignId, {
      planRevision: 3,
      dispatchEpoch: 4,
      firstLotComplete: true,
    })
  )
  const upgraded = await t.run((ctx: any) => ctx.db.get(campaignId))
  expect(upgraded).toMatchObject({
    planRevision: 3,
    dispatchEpoch: 4,
    firstLotComplete: true,
  })

  // Simulate restoring the old schema shape. This fixture tests data retention,
  // not coexistence with or safety of an old dispatch worker.
  await t.run((ctx: any) =>
    ctx.db.patch(campaignId, {
      planRevision: undefined,
      dispatchEpoch: undefined,
      firstLotComplete: undefined,
    })
  )
  const rolledBack = await read()
  expect(rolledBack.page[0].campaign).toMatchObject({
    id: campaignId,
    version: 2,
    state: 'draft',
    counters: { queued: 0, delivered: 0, submitted: 0, failed: 0, unknown: 0 },
  })
  expect(await t.run((ctx: any) => ctx.db.get(campaignId))).toMatchObject({
    revision: 2,
    state: 'draft',
    updatedAt: now,
  })
})

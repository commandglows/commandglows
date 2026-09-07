import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import schema from '../../convex/schema'
import crons from '../../convex/crons'

test('recovered legacy indexes keep records unconstrained and restore exact fields', () => {
  const local = JSON.parse(schema.export())
  const expected = {
    emailConsentEvents: {
      by_idempotencyKey: ['idempotencyKey'],
      by_emailTopic: ['emailNormalized', 'topic'],
    },
    emailSubscriptions: {
      by_emailTopic: ['emailNormalized', 'topic'],
      by_syncStatus: ['providerSyncStatus'],
    },
  }
  for (const [name, indexes] of Object.entries(expected)) {
    const table = local.tables.find((t: any) => t.tableName === name)
    expect(table.documentType).toEqual({ type: 'any' })
    expect(
      Object.fromEntries(
        table.indexes.map((i: any) => [i.indexDescriptor, i.fields])
      )
    ).toEqual(indexes)
  }
})

test('local schedules preserve every captured shared cron without additions', () => {
  const captured = JSON.parse(
    readFileSync(
      new URL(
        '../../../shipglows_data/technical/central-email-live-readiness-2026-09-07.json',
        import.meta.url
      ),
      'utf8'
    )
  )
  const local = JSON.parse(crons.export())
  expect(Object.keys(local).sort()).toEqual(
    captured.crons.map((c: any) => c.name).sort()
  )
  for (const previous of captured.crons) {
    const current = local[previous.name]
    const seconds =
      (current.schedule.seconds ?? 0) +
      (current.schedule.minutes ?? 0) * 60 +
      (current.schedule.hours ?? 0) * 3600
    expect({
      ...current,
      schedule: { type: current.schedule.type, seconds },
    }).toEqual({
      name: previous.cronSpec.udfPath.replace('.js:', ':'),
      args: [previous.cronSpec.udfArgs],
      schedule: {
        type: 'interval',
        seconds: Number(previous.cronSpec.cronSchedule.seconds),
      },
    })
  }
})

test('local schema retains every captured shared table, field and index', () => {
  const captured = JSON.parse(
    readFileSync(
      new URL(
        '../../../shipglows_data/technical/central-email-live-schema-2026-09-07.json',
        import.meta.url
      ),
      'utf8'
    )
  )
  const local = JSON.parse(schema.export())
  for (const previous of Object.values(captured.tables) as any[]) {
    const current = local.tables.find(
      (t: any) => t.tableName === previous.tableName
    )
    expect(current, previous.tableName).toBeDefined()
    for (const field of Object.keys(previous.documentType.value)) {
      expect(
        current.documentType.value[field],
        `${previous.tableName}.${field}`
      ).toEqual(previous.documentType.value[field])
    }
    for (const [name, field] of Object.entries(current.documentType.value) as [
      string,
      any,
    ][]) {
      if (!(name in previous.documentType.value))
        expect(
          field.optional,
          `${previous.tableName}.${name} must be additive`
        ).toBe(true)
    }
    for (const index of previous.indexes) {
      const next = current.indexes.find(
        (i: any) => i.indexDescriptor === index.indexDescriptor
      )
      expect(
        next,
        `${previous.tableName}.${index.indexDescriptor}`
      ).toBeDefined()
      expect(next.fields.filter((f: string) => f !== '_creationTime')).toEqual(
        index.fields.filter((f: string) => f !== '_creationTime')
      )
    }
    for (const type of ['searchIndexes', 'vectorIndexes'])
      for (const index of previous[type])
        expect(current[type]).toContainEqual(index)
  }
})

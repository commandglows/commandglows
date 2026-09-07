import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import schema from '../../convex/schema'

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

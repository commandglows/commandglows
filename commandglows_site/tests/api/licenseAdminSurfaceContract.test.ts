import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('licence administration surface wiring', () => {
  test('runs the admin API behind Clerk middleware', () => {
    expect(source('src/middleware/index.ts')).toContain("'/api/admin'")
  })

  test('hydrates the admin console through the React integration', () => {
    expect(source('astro.config.mjs')).toContain("'**/components/admin/**'")
    expect(source('src/pages/dashboard/licences.astro')).toContain(
      '<LicenseAdminConsole client:load />',
    )
  })
})

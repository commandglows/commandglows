// @vitest-environment jsdom
import { expect, test } from 'vitest'
import { installThemeContinuity } from '../src/assets/scripts/themeContinuity'

test('preserves the rendered theme before swap without retaining stale page classes', () => {
  document.documentElement.className = 'dark old-page'
  const next = document.implementation.createHTMLDocument()
  next.documentElement.className = 'light next-page'
  const dispose = installThemeContinuity()
  const event = new Event('astro:before-swap')
  Object.defineProperty(event, 'newDocument', { value: next })
  document.dispatchEvent(event)
  expect(next.documentElement.className).toBe('next-page dark')
  expect(next.documentElement.dataset.theme).toBe('dark')
  dispose()
  document.documentElement.className = 'light'
  document.dispatchEvent(event)
  expect(next.documentElement.dataset.theme).toBe('dark')
})

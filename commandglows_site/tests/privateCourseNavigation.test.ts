import { expect, test } from 'vitest'
import { getPublishedCourseEntry, getAlternatePrivateCoursePath, getPrivateCourseModuleLessons, rewritePrivateCourseLinks, privateCourseHref } from '@/utils/privateCourseNavigation'
import type { DocEntry } from '@/utils/docs'

const entry = (id: string, draft = false) => ({ id, data: { draft, title: id } }) as DocEntry
const docs = [entry('fr/formations.mdx'), entry('en/formations.mdx'), entry('fr/formations/module-2-windows/index.md'), entry('en/formations/module-2-windows/index.md'), entry('fr/formations/draft.md', true), entry('fr/about.md')]
test('private entry resolution excludes drafts and unrelated docs before rendering', () => {
  expect(getPublishedCourseEntry(docs, 'fr/formations/draft')).toBeUndefined()
  expect(getPublishedCourseEntry(docs, 'fr/about')).toBeUndefined()
  expect(getPublishedCourseEntry(docs, 'fr/formations/module-2-windows/')).toBe(docs[2])
})
test('language destination preserves the lesson and never falls back to another page', () => {
  expect(getAlternatePrivateCoursePath(docs, 'fr/formations/module-2-windows')).toBe('/dashboard/docs/en/formations/module-2-windows')
  expect(getAlternatePrivateCoursePath(docs, 'en/formations')).toBe('/dashboard/docs/fr/formations')
  expect(getAlternatePrivateCoursePath(docs, 'en/formations/draft')).toBeNull()
  expect(getAlternatePrivateCoursePath(docs, 'fr/formations/missing')).toBeNull()
})
test('module navigation includes published lessons only from the current module', () => {
  const entries = [...docs, entry('fr/formations/module-2-windows/draft.md', true), entry('fr/formations/module-2-windows/terminal.md'), entry('fr/formations/module-3-temps/index.md')]
  expect(getPrivateCourseModuleLessons(entries, 'fr/formations/module-2-windows/terminal').map(lesson => lesson.id)).toEqual(['fr/formations/module-2-windows/index.md', 'fr/formations/module-2-windows/terminal.md'])
  expect(getPrivateCourseModuleLessons(entries, 'fr/formations')).toEqual([])
})
test('hub, absolute same-site and relative lesson links remain private on initial server HTML', () => {
  const html = '<h2><a href="/fr/formations/module-2-windows/">Windows</a></h2><a class="next" href="raccourcis/?mode=read&amp;tab=all#top">Lesson</a><a href="https://www.commandglows.com/fr/formations/">Hub</a>'
  const output = rewritePrivateCourseLinks(html, 'fr/formations/module-2-windows', 'https://www.commandglows.com')
  expect(output).toContain('href="/dashboard/docs/fr/formations/module-2-windows"')
  expect(output).toContain('href="/dashboard/docs/fr/formations/module-2-windows/raccourcis?mode=read&amp;tab=all#top"')
  expect(output).toContain('href="/dashboard/docs/fr/formations"')
})
test('real lesson-sibling links resolve to a published sibling, while module links resolve to children', () => {
  const published = ['fr/formations/module-2-windows/ergonomie', 'fr/formations/module-2-windows/automatisation']
  expect(privateCourseHref('./automatisation', published[0], 'https://www.commandglows.com', published)).toBe('/dashboard/docs/fr/formations/module-2-windows/automatisation')
  expect(privateCourseHref('./automatisation', 'fr/formations/module-2-windows', 'https://www.commandglows.com', published)).toBe('/dashboard/docs/fr/formations/module-2-windows/automatisation')
  expect(privateCourseHref('./ergonomie', published[1], 'https://www.commandglows.com', published)).toBe('/dashboard/docs/fr/formations/module-2-windows/ergonomie')
})
test.each(['#heading', '/fr/contact', 'https://external.example/fr/formations/lesson', 'mailto:help@example.test', '/fr/unrelated'])('leaves non-course destination intact: %s', href => {
  expect(privateCourseHref(href, 'fr/formations', 'https://www.commandglows.com')).toBe(href)
})

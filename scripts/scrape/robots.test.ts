import { expect, test } from 'vitest'
import { isAllowed, parseRobots } from './robots.ts'

const DRUPAL_LIKE = `
# comment
User-agent: *
Disallow: /admin/
Disallow: /user/login
Allow: /admin/public$

User-agent: OtherBot
Disallow: /
`

test('applies the * group when no group names the bot', () => {
  const rules = parseRobots(DRUPAL_LIKE, 'UOFinancialsBot')
  expect(isAllowed(rules, '/content/Budget-Reports')).toBe(true)
  expect(isAllowed(rules, '/admin/settings')).toBe(false)
  expect(isAllowed(rules, '/user/login?next=x')).toBe(false)
  expect(isAllowed(rules, '/admin/public')).toBe(true)
  expect(isAllowed(rules, '/admin/publicity')).toBe(false)
})

test('prefers a group that names the bot', () => {
  const rules = parseRobots(DRUPAL_LIKE, 'otherbot')
  expect(isAllowed(rules, '/content/Budget-Reports')).toBe(false)
})

test('treats a blanket disallow as disallowing everything', () => {
  const rules = parseRobots('User-Agent: *\nDisallow: /', 'UOFinancialsBot')
  expect(isAllowed(rules, '/:b:/s/site/file')).toBe(false)
})

test('allows everything when there is no applicable group or rule', () => {
  expect(isAllowed(parseRobots('', 'UOFinancialsBot'), '/any')).toBe(true)
  expect(
    isAllowed(
      parseRobots('User-agent: *\nDisallow:', 'UOFinancialsBot'),
      '/any',
    ),
  ).toBe(true)
})

test('matches wildcards, and lets the longest rule win', () => {
  const rules = parseRobots(
    'User-agent: *\nDisallow: /*.xlsx$\nAllow: /files/brp/*.xlsx$',
    'UOFinancialsBot',
  )
  expect(isAllowed(rules, '/files/other/a.xlsx')).toBe(false)
  expect(isAllowed(rules, '/files/brp/FY26.xlsx')).toBe(true)
  expect(isAllowed(rules, '/files/brp/FY26.xlsx.bak')).toBe(true)
})

test('groups consecutive user-agent lines together', () => {
  const rules = parseRobots(
    'User-agent: a\nUser-agent: UOFinancialsBot\nDisallow: /private',
    'UOFinancialsBot',
  )
  expect(isAllowed(rules, '/private/x')).toBe(false)
})

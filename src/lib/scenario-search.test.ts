import { expect, test } from 'vitest'
import type { Rule, ScenarioScope } from './scenario'
import {
  parseRules,
  resolveBaselineIndex,
  toSearchRules,
} from './scenario-search'

const ALL: ScenarioScope = {
  group: null,
  kind: 'all',
  term: null,
  position: null,
  dept: null,
}

const RULES: Rule[] = [
  {
    kind: 'threshold',
    scope: { ...ALL, group: 'Executives', dept: '222000' },
    overCents: 20_000_000,
    cutBasisPoints: 1_250,
  },
  { kind: 'remove', scope: { ...ALL, kind: 'classified', term: 12 } },
  { kind: 'cut', scope: { ...ALL, position: 'Professor' }, cutBasisPoints: 5 },
  { kind: 'freeze', scope: ALL, years: 2, afterFreeze: 'eliminate' },
]

test('rules round-trip through the URL form in dollars and percents, leaving out "any" scope fields', () => {
  const entries = toSearchRules(RULES)
  expect(entries[0]).toEqual({
    kind: 'threshold',
    scope: { group: 'Executives', dept: '222000' },
    overDollars: 200_000,
    cutPercent: 12.5,
  })
  expect(entries[3]).toEqual({
    kind: 'freeze',
    scope: {},
    years: 2,
    afterFreeze: 'eliminate',
  })
  expect(parseRules(entries)).toEqual({ rules: RULES, dropped: 0 })
})

test('a malformed entry is dropped and counted, never read as a wider scope', () => {
  expect(
    parseRules([
      { kind: 'cut', cutPercent: 12.345 },
      { kind: 'cut', cutPercent: 0 },
      { kind: 'remove', scope: { group: 'Deans' } },
      { kind: 'freeze', years: 6, afterFreeze: 'refill' },
      { kind: 'raise' },
      'remove',
      { kind: 'remove', scope: { dept: 222000 } },
    ]),
  ).toEqual({
    rules: [{ kind: 'remove', scope: { ...ALL, dept: '222000' } }],
    dropped: 6,
  })
})

test('a case index out of range falls back to the first baseline', () => {
  expect(resolveBaselineIndex(undefined, 6)).toBe(0)
  expect(resolveBaselineIndex(3, 6)).toBe(3)
  expect(resolveBaselineIndex(6, 6)).toBe(0)
})

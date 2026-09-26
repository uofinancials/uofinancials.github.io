import { expect, test } from 'vitest'
import { ANY_SCOPE, type Rule } from './scenario'
import {
  parseDollarsText,
  parsePercentText,
  parseRules,
  parseYearsText,
  resolveBaselineIndex,
  toSearchRules,
} from './scenario-search'

const RULES: Rule[] = [
  {
    kind: 'threshold',
    scope: { ...ANY_SCOPE, group: 'Executives', dept: '222000' },
    overCents: 20_000_000,
    cutBasisPoints: 1_250,
  },
  { kind: 'remove', scope: { ...ANY_SCOPE, kind: 'classified', term: 12 } },
  {
    kind: 'cut',
    scope: { ...ANY_SCOPE, position: 'Professor' },
    cutBasisPoints: 5,
  },
  { kind: 'freeze', scope: ANY_SCOPE, years: 2, afterFreeze: 'eliminate' },
  { kind: 'eliminate', code: '223501' },
]
const BUDGET_CODES = new Set(['222000', '223501'])

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
  expect(entries[4]).toEqual({ kind: 'eliminate', code: '223501' })
  expect(parseRules(entries, BUDGET_CODES)).toEqual({
    rules: RULES,
    dropped: 0,
  })
})

test('a malformed entry is dropped and counted, never read as a wider scope', () => {
  expect(
    parseRules(
      [
        { kind: 'cut', cutPercent: 12.345 },
        { kind: 'cut', cutPercent: 0 },
        { kind: 'remove', scope: { group: 'Deans' } },
        { kind: 'freeze', years: 6, afterFreeze: 'refill' },
        { kind: 'raise' },
        'remove',
        { kind: 'remove', scope: { dept: 222000 } },
        { kind: 'eliminate', code: '2235' },
        { kind: 'eliminate', code: '223501', scope: {} },
      ],
      BUDGET_CODES,
    ),
  ).toEqual({
    rules: [{ kind: 'remove', scope: { ...ANY_SCOPE, dept: '222000' } }],
    dropped: 8,
  })
})

test('an elimination is read only when it names a code in the budget year, the router having read an all-digit code as a number', () => {
  expect(
    parseRules(
      [
        { kind: 'eliminate', code: 222000 },
        { kind: 'eliminate', code: '223100' },
      ],
      BUDGET_CODES,
    ),
  ).toEqual({ rules: [{ kind: 'eliminate', code: '222000' }], dropped: 1 })
})

test('a case names its baseline by label, and one it does not name falls back to the first', () => {
  const labels = ['Base', 'Less state funding', 'More students']
  expect(resolveBaselineIndex(undefined, labels)).toBe(0)
  expect(resolveBaselineIndex('More students', labels)).toBe(2)
  expect(resolveBaselineIndex('Withdrawn case', labels)).toBe(0)
})

test('typed amounts parse as the URL form allows, and anything else is not a value', () => {
  expect(parseDollarsText('200000')).toBe(20_000_000)
  expect(parseDollarsText('0')).toBe(0)
  for (const text of ['', ' ', '200000.5', '-1', 'abc']) {
    expect(parseDollarsText(text)).toBeNull()
  }
  expect(parsePercentText('12.5')).toBe(1_250)
  expect(parsePercentText('100')).toBe(10_000)
  for (const text of ['', '0', '100.01', '12.345']) {
    expect(parsePercentText(text)).toBeNull()
  }
  expect(parseYearsText('5')).toBe(5)
  for (const text of ['', '0', '6', '1.5']) {
    expect(parseYearsText(text)).toBeNull()
  }
})

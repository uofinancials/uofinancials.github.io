import { expect, test } from 'vitest'
import { outlookSchema } from './outlook'

const SOURCE = {
  url: 'https://example.org/packet.pdf',
  document: 'Packet',
  location: 'p. 1',
  retrievedOn: '2026-09-25',
}

const PROJECTION = {
  id: 'test',
  title: 'Test projection',
  fund: 'E&G',
  fiscalYears: [2026, 2027],
  source: SOURCE,
  lines: [
    { label: 'Revenue', section: 'revenue', kind: 'total', cents: [300, 300] },
    { label: 'Expenses', section: 'expense', kind: 'total', cents: [200, 400] },
  ],
  runRateCents: [100, -100],
  beginningFundBalanceCents: [0, 100],
  endingFundBalanceCents: [100, 0],
  weeksOfExpenses: [1, 0],
  presentValueCents: -50,
  reductionTargetCents: 100,
  reductionTargetSource: SOURCE,
  cases: [],
  casesSource: SOURCE,
  assumptions: [],
}

function parse(projection: object) {
  return outlookSchema.safeParse({
    projections: [projection],
    reportedRunRates: [],
    allFunds: {
      fiscalYear: 2027,
      egExpenseCents: 1,
      egRevenueCents: 1,
      otherExpenseCents: 1,
      otherRevenueCents: 1,
      totalExpenseCents: 2,
      totalRevenueCents: 2,
      source: SOURCE,
    },
    actions: [],
  })
}

test('a projection with one value per fiscal year in every series parses', () => {
  expect(parse(PROJECTION).success).toBe(true)
})

test('a series with a value missing for a fiscal year is rejected', () => {
  const [revenue, expenses] = PROJECTION.lines
  expect(
    parse({
      ...PROJECTION,
      lines: [revenue, { ...expenses, cents: [200] }],
    }).success,
  ).toBe(false)
  expect(parse({ ...PROJECTION, runRateCents: [100] }).success).toBe(false)
})

test('money is whole cents', () => {
  expect(parse({ ...PROJECTION, presentValueCents: -50.5 }).success).toBe(false)
})

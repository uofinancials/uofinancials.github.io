import { expect, test } from 'vitest'
import type { Projection } from '@/data/outlook'
import type { Savings, ScenarioResult } from './scenario'
import { scenarioOutlook, yearlySavings } from './scenario-outlook'

const SOURCE = {
  url: 'https://example.org/packet.pdf',
  document: 'Packet',
  location: 'p. 1',
  retrievedOn: '2026-09-25',
}

const PROJECTION: Projection = {
  id: 'test',
  title: 'Test projection',
  fiscalYears: [2026, 2027, 2028],
  source: SOURCE,
  lines: [
    {
      label: 'Revenue',
      section: 'revenue',
      kind: 'total',
      cents: [10_000, 10_000, 10_000],
    },
    {
      label: 'Expenses',
      section: 'expense',
      kind: 'total',
      cents: [9_900, 11_000, 12_000],
    },
  ],
  runRateCents: [100, -1_000, -2_000],
  beginningFundBalanceCents: [5_000, 5_100, 4_100],
  endingFundBalanceCents: [5_100, 4_100, 2_100],
  weeksOfExpenses: [26.8, 19.4, 9.1],
  presentValueCents: 0,
  reductionTargetCents: 0,
  reductionTargetSource: SOURCE,
  cases: [],
  casesSource: SOURCE,
  assumptions: [],
}

const savings = (egCents: number): Savings => ({
  jobs: 0,
  salaryCents: 0,
  fullCostCents: 0,
  egCents,
})

const RESULT: ScenarioResult = {
  base: savings(0),
  rules: [],
  total: savings(500),
  freezes: [
    { rule: 0, rateBasisPoints: 0, byYear: [savings(100), savings(200)] },
  ],
  temporaries: 0,
  opeFiscalYear: 2027,
  leaveFiscalYear: 2027,
}

test('savings start in the first year after the census and grow 3% a year, freezes by their own year', () => {
  // FY27: 500 + 100; FY28: (500 + 200) x 1.03 = 721.
  expect(yearlySavings(RESULT, 2)).toEqual([600, 721])
})

test('the remaining gap and balance roll forward from the first saving year, with weeks of expenses less savings', () => {
  const rows = scenarioOutlook({
    result: RESULT,
    projection: PROJECTION,
    censusFiscalYear: 2026,
  })
  expect(
    rows.map(
      ({
        fiscalYear,
        savingsCents,
        remainingRunRateCents,
        remainingFundBalanceCents,
        remainingWeeks,
      }) => ({
        fiscalYear,
        savingsCents,
        remainingRunRateCents,
        remainingFundBalanceCents,
        remainingWeeks,
      }),
    ),
  ).toEqual([
    // 5,100 x 52 / 9,900 = 26.79 weeks.
    {
      fiscalYear: 2026,
      savingsCents: 0,
      remainingRunRateCents: 100,
      remainingFundBalanceCents: 5_100,
      remainingWeeks: 26.8,
    },
    // 5,100 - 400; 4,700 x 52 / 10,400 = 23.5.
    {
      fiscalYear: 2027,
      savingsCents: 600,
      remainingRunRateCents: -400,
      remainingFundBalanceCents: 4_700,
      remainingWeeks: 23.5,
    },
    // 4,700 - 1,279; 3,421 x 52 / 11,279 = 15.77.
    {
      fiscalYear: 2028,
      savingsCents: 721,
      remainingRunRateCents: -1_279,
      remainingFundBalanceCents: 3_421,
      remainingWeeks: 15.8,
    },
  ])
})

test('a census after every projected year saves nothing against it', () => {
  const rows = scenarioOutlook({
    result: RESULT,
    projection: PROJECTION,
    censusFiscalYear: 2028,
  })
  expect(rows.map((row) => row.remainingFundBalanceCents)).toEqual([
    5_100, 4_100, 2_100,
  ])
})

import { expect, test } from 'vitest'
import type { Projection } from '@/data/outlook'
import type { Savings, ScenarioResult } from './scenario'
import { baselines, outlookRows, yearlySavings } from './scenario-outlook'

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
  cases: [
    {
      label: 'Base case',
      runRateCents: [100, -1_000, -2_000],
      endingFundBalanceCents: [5_100, 4_100, 2_100],
      weeksOfExpenses: [26.8, 19.4, 9.1],
      presentValueCents: 0,
    },
    {
      label: 'Less state funding',
      runRateCents: [100, -1_500, -2_500],
      endingFundBalanceCents: [5_100, 3_600, 1_100],
      weeksOfExpenses: [26.8, 17.0, 4.8],
      presentValueCents: 0,
    },
  ],
  casesSource: SOURCE,
  assumptions: [],
}

const [BASE, LESS_STATE] = baselines(PROJECTION)
const FISCAL_YEARS = PROJECTION.fiscalYears

const savings = (egCents: number): Savings => ({
  jobs: 0,
  salaryCents: 0,
  fullCostCents: 0,
  egCents,
})

const RESULT: ScenarioResult = {
  base: savings(0),
  rules: [
    {
      kind: 'freeze',
      rateBasisPoints: 0,
      byYear: [savings(100), savings(200)],
    },
  ],
  total: savings(500),
  temporaries: 0,
  opeFiscalYear: 2027,
  leaveFiscalYear: 2027,
}

test('savings start in the first year after the census and grow 3% a year, freezes by their own year', () => {
  // FY27: 500 + 100; FY28: (500 + 200) x 1.03 = 721.
  expect(yearlySavings(RESULT, 2)).toEqual([600, 721])
})

test('the baselines are the projection, named for the case that matches it, then the other cases without expenses', () => {
  expect(baselines(PROJECTION)).toEqual([
    {
      label: 'Base case',
      runRateCents: [100, -1_000, -2_000],
      endingFundBalanceCents: [5_100, 4_100, 2_100],
      expenseCents: [9_900, 11_000, 12_000],
    },
    {
      label: 'Less state funding',
      runRateCents: [100, -1_500, -2_500],
      endingFundBalanceCents: [5_100, 3_600, 1_100],
      expenseCents: null,
    },
  ])
  expect(baselines({ ...PROJECTION, cases: [] })[0]?.label).toBe(
    'The projection as published',
  )
})

test('the remaining gap and balance roll forward from the first saving year, with weeks of expenses less savings', () => {
  if (!BASE) throw new Error('The projection has a base')
  const rows = outlookRows({
    result: RESULT,
    fiscalYears: FISCAL_YEARS,
    baseline: BASE,
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

test('against a case, savings add to its own run rate and balance, and weeks are not computed', () => {
  if (!LESS_STATE) throw new Error('The projection has a second case')
  const rows = outlookRows({
    result: RESULT,
    fiscalYears: FISCAL_YEARS,
    baseline: LESS_STATE,
    censusFiscalYear: 2026,
  })
  expect(
    rows.map((row) => [
      row.runRateCents,
      row.remainingRunRateCents,
      row.remainingFundBalanceCents,
      row.remainingWeeks,
    ]),
  ).toEqual([
    [100, 100, 5_100, null],
    // -1,500 + 600; 3,600 + 600.
    [-1_500, -900, 4_200, null],
    // -2,500 + 721; 1,100 + 1,321.
    [-2_500, -1_779, 2_421, null],
  ])
})

test('a census after every projected year saves nothing against it', () => {
  if (!BASE) throw new Error('The projection has a base')
  const rows = outlookRows({
    result: RESULT,
    fiscalYears: FISCAL_YEARS,
    baseline: BASE,
    censusFiscalYear: 2028,
  })
  expect(rows.map((row) => row.remainingFundBalanceCents)).toEqual([
    5_100, 4_100, 2_100,
  ])
})

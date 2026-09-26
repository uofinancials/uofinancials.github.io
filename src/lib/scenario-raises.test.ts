import { expect, test } from 'vitest'
import type { FallRecord } from '@/data/fall'
import { ANY_SCOPE } from '@/lib/scenario'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { acrossTheBoardTerm, poolTerm } from '@/test/raise-terms'
import { AREA, RATES, scenarioBudget, UNIT } from '@/test/scenario-fixtures'
import { toDepartmentCensus } from './department-jobs'
import { RAISE_ROWS } from './raise-groups'
import { type Rule, runScenario, type ScenarioScope } from './scenario'
import { yearlySavings } from './scenario-outlook'
import {
  type RaiseFreezeRule,
  type RaiseRate,
  raiseRates,
} from './scenario-raises'

const PAY = { code: UNIT, name: 'CAS Biology' }
const CLASSIFIED: ScenarioScope = { ...ANY_SCOPE, kind: 'classified' }
const BUDGET = scenarioBudget([])

function rowNamed(label: string) {
  const row = RAISE_ROWS.find((known) => known.label === label)
  if (!row) throw new Error(`No raise row ${label}`)
  return row
}

const SEIU = rowNamed('SEIU 503')
const CAREER_INSTRUCTIONAL = rowNamed('United Academics, career instructional')
const TENURE = rowNamed('United Academics, tenure-related')

test("a row's first-year rate sums the year's terms that cover it, and is 3% with none", () => {
  const rates = raiseRates(
    [
      acrossTheBoardTerm('SEIU 503', 500, '2026-11-01'),
      acrossTheBoardTerm('SEIU 503', 900, '2027-07-01'),
      acrossTheBoardTerm('United Academics', 200, '2026-09-01', [
        'tenure-related',
      ]),
      poolTerm('United Academics', 300, '2026-09-01', ['tenure-related']),
      poolTerm('United Academics', null, '2019-01-01'),
      poolTerm('United Academics', 400, null),
    ],
    2027,
  )
  const rateOf = (label: string) => rates.find((rate) => rate.label === label)
  expect(rateOf(SEIU.label)).toMatchObject({ basisPoints: 500 })
  expect(rateOf(SEIU.label)?.sources).toHaveLength(1)
  expect(rateOf(TENURE.label)).toMatchObject({ basisPoints: 500 })
  expect(rateOf(TENURE.label)?.sources).toHaveLength(2)
  expect(rateOf(CAREER_INSTRUCTIONAL.label)).toEqual({
    row: CAREER_INSTRUCTIONAL,
    label: CAREER_INSTRUCTIONAL.label,
    basisPoints: 300,
    sources: [],
  })
  expect(rates.at(-1)).toEqual({
    row: null,
    label: 'Other jobs',
    basisPoints: 300,
    sources: [],
  })
  expect(rates).toHaveLength(RAISE_ROWS.length + 1)
})

test('a term the rates use must be whole basis points', () => {
  expect(() =>
    raiseRates([poolTerm('United Academics', null, '2026-09-01')], 2027),
  ).toThrow('United Academics term "Test" (1.625%) has no whole basis points')
})

const RATES_USED: RaiseRate[] = [
  { row: SEIU, label: SEIU.label, basisPoints: 500, sources: [] },
  {
    row: CAREER_INSTRUCTIONAL,
    label: CAREER_INSTRUCTIONAL.label,
    basisPoints: 400,
    sources: [],
  },
]

const job = (name: string, annualSalaryRateCents: number) =>
  classifiedJob({ name, payDepartment: PAY, annualSalaryRateCents })
const censusOf = (year: number, records: FallRecord[]) =>
  toDepartmentCensus({ year, records }, BUDGET)

// Avila is SEIU (5%), Diaz career instructional (4%), and Eve, with no rank or OA grade, in no row (3%).
const RECORDS = [
  job('Avila', 10_000_000),
  unclassifiedJob({ name: 'Diaz', payDepartment: PAY }),
  unclassifiedJob({
    name: 'Eve',
    payDepartment: PAY,
    rank: 'No Rank',
    annualSalaryRateCents: 2_000_000,
  }),
]
// 2024 to 2025: Brown's 10,000,000 of 20,000,000 classified spend leaves (50%).
const HISTORY = [
  censusOf(2024, [job('Avila', 10_000_000), job('Brown', 10_000_000)]),
  censusOf(2025, RECORDS),
]
const [, CENSUS] = HISTORY

function raises(overrides: Partial<RaiseFreezeRule> = {}): RaiseFreezeRule {
  return {
    kind: 'raises',
    scope: ANY_SCOPE,
    years: 1,
    capBasisPoints: 0,
    ...overrides,
  }
}

// OPE rates for FY2030 are not published, so costs are salary, and every job is all E&G.
function run(rules: Rule[]) {
  if (!CENSUS) throw new Error('The test history has no 2025 census')
  return runScenario({
    census: CENSUS,
    rules,
    rates: RATES,
    egShares: new Map([[AREA, 10_000]]),
    opeFiscalYear: 2030,
    history: HISTORY,
    projectedYears: 3,
    eliminationBudget: BUDGET,
    raiseRates: RATES_USED,
  })
}

function egByYear(rules: Rule[], index = 0) {
  const result = run(rules).rules[index]
  return result?.kind === 'raises'
    ? result.byYear.map(({ jobs, egCents }) => [jobs, egCents])
    : null
}

test("a one-year freeze saves each row's first-year raise, then the lower pay grows 3% with no catch-up", () => {
  const result = run([raises()])
  // Year 1: 5% of 10,000,000 + 4% of 5,000,000 + 3% of 2,000,000; later years x 1.03 each.
  expect(result.rules[0]).toEqual({
    kind: 'raises',
    byYear: [
      { jobs: 3, salaryCents: 760_000, fullCostCents: null, egCents: 760_000 },
      { jobs: 3, salaryCents: 782_800, fullCostCents: null, egCents: 782_800 },
      { jobs: 3, salaryCents: 806_284, fullCostCents: null, egCents: 806_284 },
    ],
  })
  expect(yearlySavings(result, { years: 3, firstFiscalYear: 2027 })).toEqual([
    760_000, 782_800, 806_284,
  ])
})

test('a cap saves only the raise above it, and nothing where the raise is below it', () => {
  // Against 1.01, 1.0201, 1.050703 capped: Avila 1.05, 1.0815, 1.113945; Diaz 1.04, 1.0712, 1.103336; Eve 1.03, 1.0609, 1.092727.
  expect(egByYear([raises({ years: 2, capBasisPoints: 100 })])).toEqual([
    [3, 400_000 + 150_000 + 40_000],
    [3, 614_000 + 255_500 + 81_600],
    [3, 632_420 + 263_165 + 84_048],
  ])
  expect(egByYear([raises({ capBasisPoints: 500 })])).toEqual([
    [0, 0],
    [0, 0],
    [0, 0],
  ])
})

test('raise freezes over one job apply in order, each to the raise the earlier ones left', () => {
  const capped = raises({ scope: CLASSIFIED, capBasisPoints: 100 })
  const full = raises({ scope: CLASSIFIED })
  expect(egByYear([capped, full], 1)).toEqual([
    [1, 100_000],
    [1, 103_000],
    [1, 106_090],
  ])
})

test('a raise freeze saves on the pay earlier rules left, and only on what a hiring freeze keeps filled', () => {
  expect(
    egByYear(
      [
        { kind: 'cut', scope: CLASSIFIED, cutBasisPoints: 1_000 },
        raises({ scope: CLASSIFIED }),
      ],
      1,
    ),
  ).toEqual([
    [1, 450_000],
    [1, 463_500],
    [1, 477_405],
  ])
  expect(
    egByYear(
      [{ kind: 'remove', scope: CLASSIFIED }, raises({ scope: CLASSIFIED })],
      1,
    ),
  ).toEqual([
    [0, 0],
    [0, 0],
    [0, 0],
  ])
  // The 50% hiring freeze holds half of Avila's job in year 1, then refills it.
  expect(
    egByYear([
      raises({ scope: CLASSIFIED }),
      { kind: 'freeze', scope: CLASSIFIED, years: 1, afterFreeze: 'refill' },
    ]),
  ).toEqual([
    [1, 250_000],
    [1, 515_000],
    [1, 530_450],
  ])
})

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../src/data/budget.ts'
import { fallYearSchema } from '../src/data/fall.ts'
import { opeRatesSchema } from '../src/data/ope.ts'
import { outlookSchema } from '../src/data/outlook.ts'
import { toDepartmentCensus } from '../src/lib/department-jobs.ts'
import { egShares } from '../src/lib/eg-share.ts'
import { opeGroupOf } from '../src/lib/ope-groups.ts'
import {
  type Rule,
  runScenario,
  type ScenarioScope,
} from '../src/lib/scenario.ts'
import { scenarioOutlook } from '../src/lib/scenario-outlook.ts'
import { trendGroupOf } from '../src/lib/trend-groups.ts'
import { budgetDataPath, DATA_DIR, OPE_DATA_PATH } from './scrape/cache.ts'

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function readFall(year: number) {
  return fallYearSchema.parse(
    readJson(path.join(DATA_DIR, 'fall', `${year}.json`)),
  ).records
}

function opeGroupCounts(year: number): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const record of readFall(year)) {
    const ref = opeGroupOf(record, trendGroupOf(record, year), year)
    const key = ref ? [ref.group, ref.leave].filter(Boolean).join(' ') : 'none'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

test('every job in Fall 2019-2025 maps to an OPE group, and 2019 and 2025 match an independent count', () => {
  for (let year = 2020; year <= 2024; year++) opeGroupCounts(year)
  expect(opeGroupCounts(2019)).toEqual({
    'Faculty/Staff A': 1618,
    Athletics: 261,
    'Faculty/Staff B Exec': 31,
    'Faculty/Staff B Faculty': 1644,
    'Faculty/Staff C': 390,
    'Classified Service': 444,
    'Classified Skilled/Clerical': 611,
    'Classified Technical': 490,
    none: 1349,
  })
  expect(opeGroupCounts(2025)).toEqual({
    'Faculty/Staff A': 1970,
    Athletics: 285,
    'Faculty/Staff B Exec': 34,
    'Faculty/Staff B Faculty': 1489,
    'Faculty/Staff C': 326,
    'Classified Service': 537,
    'Classified Skilled/Clerical': 636,
    'Classified Technical': 572,
    none: 991,
  })
})

const RATES = opeRatesSchema.parse(readJson(OPE_DATA_PATH))
const FY26 = budgetYearSchema.parse(readJson(budgetDataPath(2026)))
const FALL_2025 = toDepartmentCensus(
  { year: 2025, records: readFall(2025) },
  FY26,
)
const SHARES_2025 = egShares(FALL_2025, FY26)

test('Fall 2025 against the FY26 budget: $504.8M of pay, $297.2M of it E&G, and Athletics and Housing at 0%', () => {
  const { base } = runScenario({
    census: FALL_2025,
    rules: [],
    rates: RATES,
    egShares: SHARES_2025,
    opeFiscalYear: 2000,
  })
  expect(SHARES_2025.size).toBe(44)
  expect(Math.round(base.salaryCents / 10_000_000)).toBe(5_048)
  expect(Math.round(base.egCents / 10_000_000)).toBe(2_972)
  expect(SHARES_2025.get('480000')).toBe(0)
  expect(SHARES_2025.get('470000')).toBe(0)
  expect(SHARES_2025.get('222000')).toBe(8_633)
})

const FIRST_BUDGET_YEAR = 2021
const HISTORY = [2019, 2020, 2021, 2022, 2023, 2024].map((year) =>
  toDepartmentCensus(
    { year, records: readFall(year) },
    budgetYearSchema.parse(
      readJson(budgetDataPath(Math.max(FIRST_BUDGET_YEAR, year + 1))),
    ),
  ),
)
HISTORY.push(FALL_2025)
const [PROJECTION] = outlookSchema.parse(
  readJson(path.join(DATA_DIR, 'outlook.json')),
).projections
const ALL: ScenarioScope = {
  group: null,
  kind: 'all',
  term: null,
  position: null,
  dept: null,
}

/** Fall 2025 at FY27 OPE rates, the first year the projection's gap is set against. */
function runFall2025(rules: Rule[]) {
  const result = runScenario({
    census: FALL_2025,
    rules,
    rates: RATES,
    egShares: SHARES_2025,
    opeFiscalYear: 2027,
    history: HISTORY,
    projectedYears: 5,
  })
  const rows = scenarioOutlook({
    result,
    projection: PROJECTION,
    censusFiscalYear: 2026,
  })
  return { result, rows }
}

test('with no rules, the outlook is the projection as published', () => {
  const { rows } = runFall2025([])
  expect(rows.map((row) => row.remainingFundBalanceCents)).toEqual(
    PROJECTION.endingFundBalanceCents,
  )
  expect(rows.map((row) => row.remainingWeeks)).toEqual(
    PROJECTION.weeksOfExpenses,
  )
})

// The values below match an independent Python recomputation over public/data/.
test('question 2: 10% off pay above $200,000 reaches 263 jobs and saves $1.4M of E&G a year', () => {
  const { result } = runFall2025([
    {
      kind: 'threshold',
      scope: ALL,
      overCents: 20_000_000,
      cutBasisPoints: 1_000,
    },
  ])
  expect(result.rules).toEqual([
    {
      jobs: 263,
      salaryCents: 390_002_400,
      fullCostCents: 531_755_250,
      egCents: 138_719_911,
    },
  ])
})

test('question 6: a $250,000 cap reaches 127 jobs and saves $31.2M of pay, $6.8M of it E&G', () => {
  const { result } = runFall2025([
    {
      kind: 'threshold',
      scope: ALL,
      overCents: 25_000_000,
      cutBasisPoints: 10_000,
    },
  ])
  expect(result.rules).toEqual([
    {
      jobs: 127,
      salaryCents: 3_118_342_649,
      fullCostCents: 4_186_184_049,
      egCents: 684_768_357,
    },
  ])
})

test('question 7: executives -10% saves $1.3M of E&G; then everyone -2% saves $9.2M more', () => {
  const { result } = runFall2025([
    {
      kind: 'cut',
      scope: { ...ALL, group: 'Executives' },
      cutBasisPoints: 1_000,
    },
    { kind: 'cut', scope: ALL, cutBasisPoints: 200 },
  ])
  expect(result.rules).toEqual([
    {
      jobs: 35,
      salaryCents: 140_175_380,
      fullCostCents: 191_049_126,
      egCents: 126_930_775,
    },
    {
      jobs: 6_291,
      salaryCents: 1_006_820_603,
      fullCostCents: 1_548_837_709,
      egCents: 916_363_650,
    },
  ])
})

test('question 4: a one-year classified freeze at 10.33% turnover leaves 189 positions empty and saves $9.1M of E&G in FY27', () => {
  const { result, rows } = runFall2025([
    {
      kind: 'freeze',
      scope: { ...ALL, kind: 'classified' },
      years: 1,
      afterFreeze: 'refill',
    },
  ])
  const [freeze] = result.freezes
  expect(freeze?.rateBasisPoints).toBe(1_033)
  expect(freeze?.byYear.map(({ jobs, egCents }) => [jobs, egCents])).toEqual([
    [189, 907_357_500],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ])
  expect(rows.map((row) => row.savingsCents)).toEqual([
    0, 907_357_500, 0, 0, 0, 0,
  ])
})

test('questions 15 and 16: a one-year freeze and 5% off pay above $150,000 turn FY27 to a surplus, and the balance still runs out in FY30', () => {
  const { rows } = runFall2025([
    { kind: 'freeze', scope: ALL, years: 1, afterFreeze: 'refill' },
    {
      kind: 'threshold',
      scope: ALL,
      overCents: 15_000_000,
      cutBasisPoints: 500,
    },
  ])
  expect(rows.map((row) => row.savingsCents)).toEqual([
    0, 4_742_365_500, 158_729_392, 163_491_274, 168_396_012, 173_447_893,
  ])
  expect(rows.map((row) => row.remainingRunRateCents)).toEqual([
    448_500_000, 2_465_306_200, -4_165_992_508, -5_515_958_026, -6_786_806_888,
    -7_140_938_907,
  ])
  expect(
    rows.find((row) => row.remainingFundBalanceCents < 0)?.fiscalYear,
  ).toBe(2030)
  expect(rows.at(-1)?.remainingFundBalanceCents).toBe(-8_729_034_329)
})

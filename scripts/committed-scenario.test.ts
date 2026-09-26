import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../src/data/budget.ts'
import { fallYearSchema } from '../src/data/fall.ts'
import { manifestSchema } from '../src/data/manifest.ts'
import { opeRatesSchema } from '../src/data/ope.ts'
import { outlookSchema } from '../src/data/outlook.ts'
import { toDepartmentCensuses } from '../src/lib/department-jobs.ts'
import { egShareOf, egShares } from '../src/lib/eg-share.ts'
import { opeGroupOf } from '../src/lib/ope-groups.ts'
import {
  fiscalYearOf,
  isClassifiedTemp,
  jobSpendCents,
} from '../src/lib/overview.ts'
import {
  ANY_SCOPE as ALL,
  type Rule,
  type ScenarioResult,
} from '../src/lib/scenario.ts'
import { freezeHistoryCensuses } from '../src/lib/scenario-freeze.ts'
import { baselines, scenarioOutlook } from '../src/lib/scenario-outlook.ts'
import { trendGroupOf } from '../src/lib/trend-groups.ts'
import {
  budgetDataPath,
  DATA_DIR,
  MANIFEST_PATH,
  OPE_DATA_PATH,
} from './scrape/cache.ts'

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'))
}

const MANIFEST = manifestSchema.parse(readJson(MANIFEST_PATH))
const RATES = opeRatesSchema.parse(readJson(OPE_DATA_PATH))
const CENSUSES = freezeHistoryCensuses(MANIFEST, RATES)
const FALLS = CENSUSES.map(({ year }) =>
  fallYearSchema.parse(readJson(path.join(DATA_DIR, 'fall', `${year}.json`))),
)
const BUDGETS = [...new Set(CENSUSES.map(({ fiscalYear }) => fiscalYear))].map(
  (fiscalYear) => budgetYearSchema.parse(readJson(budgetDataPath(fiscalYear))),
)
const HISTORY = toDepartmentCensuses(MANIFEST, FALLS, BUDGETS)
const [PROJECTION] = outlookSchema.parse(
  readJson(path.join(DATA_DIR, 'outlook.json')),
).projections

function latest<T>(items: T[]): T {
  const item = items.at(-1)
  if (item === undefined) throw new Error('The committed data has no census')
  return item
}

const FALL_2025 = latest(HISTORY)
const FALL_2025_DATE = latest(FALLS).censusDate
const FY26 = BUDGETS.find(
  ({ fiscalYear }) => fiscalYear === FALL_2025.fiscalYear,
)
if (!FY26) throw new Error('The budget Fall 2025 is joined to is not loaded')
const SHARES_2025 = egShares(FALL_2025, FY26)

function opeGroupCounts(year: number): Record<string, number> {
  const census = HISTORY.find((listed) => listed.year === year)
  const counts: Record<string, number> = {}
  for (const record of census?.records ?? []) {
    const ref = opeGroupOf(record, trendGroupOf(record, year), year)
    const key = ref ? [ref.group, ref.leave].filter(Boolean).join(' ') : 'none'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

test('a freeze averages turnover over Fall 2019-2025, the censuses with a published OPE rate', () => {
  expect(CENSUSES).toEqual([
    { year: 2019, fiscalYear: 2021 },
    { year: 2020, fiscalYear: 2021 },
    { year: 2021, fiscalYear: 2022 },
    { year: 2022, fiscalYear: 2023 },
    { year: 2023, fiscalYear: 2024 },
    { year: 2024, fiscalYear: 2025 },
    { year: 2025, fiscalYear: 2026 },
  ])
})

test('every job in Fall 2019-2025 maps to an OPE group, and 2019 and 2025 match an independent count', () => {
  for (const { year } of HISTORY) opeGroupCounts(year)
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

test('Fall 2025 against the FY26 budget: $504.8M of pay, $297.2M of it E&G, and Athletics and Housing at 0%', () => {
  const jobs = FALL_2025.records.filter((record) => !isClassifiedTemp(record))
  const payCents = jobs.reduce((sum, record) => sum + jobSpendCents(record), 0)
  const egPayCents = jobs.reduce(
    (sum, record) =>
      sum +
      (jobSpendCents(record) * egShareOf(record, FALL_2025, SHARES_2025)) /
        10_000,
    0,
  )
  expect(FY26.fiscalYear).toBe(2026)
  expect(SHARES_2025.size).toBe(44)
  expect(Math.round(payCents / 10_000_000)).toBe(5_048)
  expect(Math.round(egPayCents / 10_000_000)).toBe(2_972)
  expect(SHARES_2025.get('480000')).toBe(0)
  expect(SHARES_2025.get('470000')).toBe(0)
  expect(SHARES_2025.get('222000')).toBe(8_633)
})

function censusSavings(result: ScenarioResult) {
  return result.rules.map((rule) =>
    rule.kind === 'census' ? rule.savings : null,
  )
}

const BASELINES = baselines(PROJECTION)
const STATE_FUNDING_BELOW = BASELINES.findIndex(({ label }) =>
  label.startsWith('State funding $20 million below'),
)

/** Fall 2025 set against a baseline, from FY27 at FY27 OPE rates. */
function runFall2025(rules: Rule[], baselineIndex = 0) {
  const baseline = BASELINES[baselineIndex]
  if (!baseline) throw new Error(`No baseline ${baselineIndex}`)
  return scenarioOutlook({
    census: FALL_2025,
    censusFiscalYear: fiscalYearOf(FALL_2025_DATE),
    rules,
    rates: RATES,
    egShares: SHARES_2025,
    history: HISTORY,
    fiscalYears: PROJECTION.fiscalYears,
    baseline,
  })
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
test('the baselines are the projection, named for its base case, and its five other cases', () => {
  expect(BASELINES.map(({ label }) => label)).toEqual(
    PROJECTION.cases.map(({ label }) => label),
  )
  expect(BASELINES[0]?.expenseCents).not.toBeNull()
  expect(STATE_FUNDING_BELOW).toBe(3)
})

test('question 2: 10% off pay above $200,000 reaches 263 jobs and saves $1.4M of E&G a year', () => {
  const { result } = runFall2025([
    {
      kind: 'threshold',
      scope: ALL,
      overCents: 20_000_000,
      cutBasisPoints: 1_000,
    },
  ])
  expect(censusSavings(result)).toEqual([
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
  expect(censusSavings(result)).toEqual([
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
  expect(censusSavings(result)).toEqual([
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
  const [freeze] = result.rules
  if (freeze?.kind !== 'freeze') throw new Error('The rule is a freeze')
  expect(result.opeFiscalYear).toBe(2027)
  expect(freeze.rateBasisPoints).toBe(1_033)
  expect(freeze.byYear.map(({ jobs, egCents }) => [jobs, egCents])).toEqual([
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

test('question 13: the same stack against state funding $20M below projection leaves the balance negative from FY30', () => {
  const stack: Rule[] = [
    { kind: 'freeze', scope: ALL, years: 1, afterFreeze: 'refill' },
    {
      kind: 'threshold',
      scope: ALL,
      overCents: 15_000_000,
      cutBasisPoints: 500,
    },
  ]
  const { rows } = runFall2025(stack, STATE_FUNDING_BELOW)
  expect(rows.map((row) => row.remainingRunRateCents)).toEqual([
    448_500_000, 2_465_306_200, -6_165_992_508, -7_625_958_026, -8_981_206_888,
    -9_423_114_907,
  ])
  expect(rows.map((row) => row.remainingFundBalanceCents)).toEqual([
    12_415_355_700, 14_880_662_000, 8_714_669_492, 1_088_711_466,
    -7_892_495_422, -17_315_610_329,
  ])
  expect(rows.every((row) => row.remainingWeeks === null)).toBe(true)
})

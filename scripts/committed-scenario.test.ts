import path from 'node:path'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../src/data/budget.ts'
import { fallYearSchema } from '../src/data/fall.ts'
import { manifestSchema } from '../src/data/manifest.ts'
import { opeRatesSchema } from '../src/data/ope.ts'
import { outlookSchema } from '../src/data/outlook.ts'
import { raiseTermsSchema } from '../src/data/raises.ts'
import { toDepartmentCensuses } from '../src/lib/department-jobs.ts'
import { egShareOf, egShares } from '../src/lib/eg-share.ts'
import { opeGroupOf } from '../src/lib/ope-groups.ts'
import {
  fiscalYearOf,
  isClassifiedTemp,
  jobSpendCents,
} from '../src/lib/overview.ts'
import { raiseRowOf } from '../src/lib/raise-groups.ts'
import {
  ANY_SCOPE as ALL,
  type Rule,
  type ScenarioResult,
} from '../src/lib/scenario.ts'
import { freezeHistoryCensuses } from '../src/lib/scenario-freeze.ts'
import {
  costOf,
  type Job,
  PROJECTED_RAISE_BASIS_POINTS,
  ratesFor,
  toJobs,
} from '../src/lib/scenario-jobs.ts'
import {
  baselines,
  outlookRows,
  projectScenario,
} from '../src/lib/scenario-outlook.ts'
import { raiseRates } from '../src/lib/scenario-raises.ts'
import { trendGroupOf } from '../src/lib/trend-groups.ts'
import {
  budgetDataPath,
  DATA_DIR,
  MANIFEST_PATH,
  OPE_DATA_PATH,
  RAISES_DATA_PATH,
  readJson,
} from './scrape/cache.ts'

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
const FY27 = budgetYearSchema.parse(readJson(budgetDataPath(2027)))
const RAISE_RATES = raiseRates(
  raiseTermsSchema.parse(readJson(RAISES_DATA_PATH)).terms,
  2027,
)
const RATE_OF_ROW = new Map(
  RAISE_RATES.map(({ row, basisPoints }) => [row, basisPoints]),
)
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
const FY27_RATES = ratesFor(RATES, 2027)

/** A Fall 2025 job's FY27 raise, read straight from its raise row. */
function firstRaiseOf(job: Job): number {
  const row = raiseRowOf(job.record, 2025, trendGroupOf(job.record, 2025))
  return RATE_OF_ROW.get(row) ?? PROJECTED_RAISE_BASIS_POINTS
}

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

/** Fall 2025 set against a baseline, from FY27 at FY27 OPE rates, with eliminations from the FY27 budget. */
function runFall2025(rules: Rule[], baselineIndex = 0) {
  const baseline = BASELINES[baselineIndex]
  if (!baseline) throw new Error(`No baseline ${baselineIndex}`)
  const options = {
    census: FALL_2025,
    censusFiscalYear: fiscalYearOf(FALL_2025_DATE),
    fiscalYears: PROJECTION.fiscalYears,
  }
  const result = projectScenario({
    ...options,
    rules,
    rates: RATES,
    egShares: SHARES_2025,
    history: HISTORY,
    eliminationBudget: FY27,
    raiseRates: RAISE_RATES,
  })
  return { result, rows: outlookRows({ ...options, result, baseline }) }
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

test('question 4: a one-year classified freeze at 10.33% turnover leaves 189 positions empty and saves $9.3M of E&G in FY27', () => {
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
  // 10.33% of each classified job's E&G cost, in FY27 pay at its raise row's rate.
  const classified = toJobs(FALL_2025, SHARES_2025).filter(
    (job) => job.record.kind === 'classified',
  )
  const directCents = classified.reduce((sum, job) => {
    const { egCents } = costOf(job, FY27_RATES)
    const fy27Cents = (egCents * (10_000 + firstRaiseOf(job))) / 10_000
    return sum + (fy27Cents * 1_033) / 10_000
  }, 0)
  expect(Math.abs((freeze.byYear[0]?.egCents ?? 0) - directCents)).toBeLessThan(
    classified.length,
  )
  expect(freeze.byYear.map(({ jobs, egCents }) => [jobs, egCents])).toEqual([
    [189, 934_578_209],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ])
  expect(rows.map((row) => row.savingsCents)).toEqual([
    0, 934_578_209, 0, 0, 0, 0,
  ])
})

test('questions 15 and 16: a one-year freeze and 5% off pay above $150,000 turn FY27 to a surplus, and the balance still runs out in FY30', () => {
  const overCents = 15_000_000
  const { result, rows } = runFall2025([
    { kind: 'freeze', scope: ALL, years: 1, afterFreeze: 'refill' },
    { kind: 'threshold', scope: ALL, overCents, cutBasisPoints: 500 },
  ])
  const [freeze] = result.rules
  if (freeze?.kind !== 'freeze') throw new Error('The rule is a freeze')
  // Each job over $150,000 keeps 95% of the part above it; its E&G saving takes the job's FY27 raise.
  const cut = toJobs(FALL_2025, SHARES_2025).filter(
    (job) => job.rateCents > overCents,
  )
  const directCents = cut.reduce((sum, job) => {
    const kept = {
      ...job,
      rateCents:
        overCents + Math.round(((job.rateCents - overCents) * 9_500) / 10_000),
    }
    const savedCents =
      costOf(job, FY27_RATES).egCents - costOf(kept, FY27_RATES).egCents
    return (
      sum + Math.round((savedCents * (10_000 + firstRaiseOf(job))) / 10_000)
    )
  }, 0)
  const [censusCents = 0] = result.censusEgByYear
  expect(Math.abs(censusCents - directCents)).toBeLessThan(cut.length)
  expect(rows[1]?.savingsCents).toBe(
    censusCents + (freeze.byYear[0]?.egCents ?? 0),
  )
  expect(rows.map((row) => row.savingsCents)).toEqual([
    0, 4_929_758_927, 165_387_739, 170_349_372, 175_459_853, 180_723_650,
  ])
  expect(rows.map((row) => row.remainingRunRateCents)).toEqual([
    448_500_000, 2_652_699_627, -4_159_334_161, -5_509_099_928, -6_779_743_047,
    -7_133_663_150,
  ])
  expect(
    rows.find((row) => row.remainingFundBalanceCents < 0)?.fiscalYear,
  ).toBe(2030)
  expect(rows.at(-1)?.remainingFundBalanceCents).toBe(-8_513_784_859)
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
    448_500_000, 2_652_699_627, -6_159_334_161, -7_619_099_928, -8_974_143_047,
    -9_415_839_150,
  ])
  expect(rows.map((row) => row.remainingFundBalanceCents)).toEqual([
    12_415_355_700, 15_068_055_427, 8_908_721_266, 1_289_621_338,
    -7_684_521_709, -17_100_360_859,
  ])
  expect(rows.every((row) => row.remainingWeeks === null)).toBe(true)
})

// Budget figures below match an independent sum of public/data/budget/FY27.json rows.
test('question 12: eliminating Arts & Sciences saves $184.2M of FY27 E&G lines and takes its 1,219 census jobs from the other rules', () => {
  const { result, rows } = runFall2025([
    { kind: 'eliminate', code: '222000' },
    { kind: 'remove', scope: { ...ALL, dept: '222000' } },
  ])
  expect(result.rules).toEqual([
    {
      kind: 'eliminate',
      code: '222000',
      name: 'Arts & Sciences, College of',
      isArea: true,
      jobs: 1_219,
      eg: {
        payCents: 10_721_399_400,
        opeCents: 7_236_959_350,
        servicesCents: 462_648_200,
      },
      egCents: 18_421_006_950,
      allFundsCents: 19_107_829_350,
      isPartlyMatched: false,
      isCovered: false,
    },
    {
      kind: 'census',
      savings: { jobs: 0, salaryCents: 0, fullCostCents: 0, egCents: 0 },
    },
  ])
  expect(rows[1]?.savingsCents).toBe(18_421_006_950)
})

test('a unit the census files under another code is partly matched; one it files under its own is not', () => {
  const { result } = runFall2025([
    { kind: 'eliminate', code: '223501' },
    { kind: 'eliminate', code: '222050' },
  ])
  expect(result.rules).toMatchObject([
    {
      name: 'CAS Mathematics',
      jobs: 0,
      egCents: 1_170_655_800,
      allFundsCents: 1_182_627_900,
      isPartlyMatched: true,
    },
    {
      name: 'CAS English',
      jobs: 72,
      egCents: 866_622_200,
      allFundsCents: 889_222_100,
      isPartlyMatched: false,
    },
  ])
})

test('question 17: the FY27 raise rates follow the cited terms, with 3% where none is published', () => {
  expect(
    Object.fromEntries(
      RAISE_RATES.map(({ label, basisPoints, sources }) => [
        label,
        [basisPoints, sources.length],
      ]),
    ),
  ).toEqual({
    'United Academics, tenure-related': [500, 2],
    'United Academics, career instructional': [462, 2],
    'United Academics, career research': [300, 1],
    'United Academics, pro tem, visiting, and retired': [200, 1],
    'SEIU 503': [300, 0],
    'Teamsters 206': [300, 1],
    'UOPA, police officers': [300, 0],
    'UOPA, dispatchers': [300, 0],
    'UOPA, community service officers': [300, 0],
    'Officers of Administration': [375, 1],
    'Other jobs': [300, 0],
  })
})

test("question 17: a one-year raise freeze saves $18.1M of E&G in FY27, each job's FY27 raise, then that saving grows 3% a year", () => {
  const { result, rows } = runFall2025([
    { kind: 'raises', scope: ALL, years: 1, capBasisPoints: 0 },
  ])
  const [freeze] = result.rules
  if (freeze?.kind !== 'raises') throw new Error('No raise freeze result')
  const directCents = toJobs(FALL_2025, SHARES_2025).reduce((sum, job) => {
    const { egCents } = costOf(job, FY27_RATES)
    return sum + Math.round((egCents * firstRaiseOf(job)) / 10_000)
  }, 0)
  expect(freeze.byYear[0]?.egCents).toBe(directCents)
  const years = [
    1_812_143_671, 1_866_507_955, 1_922_503_123, 1_980_178_281, 2_039_583_596,
  ]
  expect(freeze.byYear.map(({ egCents }) => egCents)).toEqual(years)
  expect(freeze.byYear.every(({ jobs }) => jobs === 6_291)).toBe(true)
  // Each later year is the one before x 1.03, give or take a cent per job.
  years.slice(1).forEach((cents, index) => {
    const before = years[index] ?? 0
    expect(Math.abs(cents - before * 1.03)).toBeLessThan(6_291)
  })
  expect(rows.map((row) => row.savingsCents)).toEqual([0, ...years])
})

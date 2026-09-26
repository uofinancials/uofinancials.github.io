import { expect, test } from 'vitest'
import type { Manifest } from '@/data/manifest'
import { classifiedJob, fallFile, unclassifiedJob } from '@/test/fall-records'
import { acrossTheBoardTerm } from '@/test/raise-terms'
import {
  AREA,
  budgetRow,
  RATES,
  scenarioBudget,
  TEST_PROJECTION,
  UNIT,
} from '@/test/scenario-fixtures'
import { toDepartmentCensus } from './department-jobs'
import { areaFigures } from './department-table'
import {
  areaBars,
  exampleAnswers,
  HOME_EXAMPLES,
  headlineFigures,
  jobsByCensus,
  placementBases,
  topPaidJobs,
} from './home'
import { UNASSIGNED_AREA } from './overview'
import { raiseRates } from './scenario-raises'

const TEMP = classifiedJob({
  name: 'Temp, Tia',
  annualSalaryRateCents: 90_000_000,
  positionClass: { code: 'TS4017', title: null },
})

test('the headlines are the run rate after the census, the summed budget, and the census spend and people', () => {
  const budget = scenarioBudget([
    budgetRow({
      org: UNIT,
      fund: 'EG0001',
      accountType: '61',
      totalExpenditureBudgetCents: 700,
    }),
    budgetRow({
      org: UNIT,
      fund: 'GF0001',
      accountType: '71',
      totalExpenditureBudgetCents: 300,
    }),
  ])
  expect(
    headlineFigures({
      records: [
        classifiedJob({ apptPercent: 50 }),
        classifiedJob({ jobType: 'Secondary', apptPercent: 50 }),
        TEMP,
      ],
      budget,
      projection: TEST_PROJECTION,
      censusFiscalYear: 2026,
    }),
  ).toEqual({
    runRate: { fiscalYear: 2027, cents: -1_000 },
    budgetCents: 1_000,
    spendCents: 5_000_000,
    people: 2,
  })
})

test('the home examples are census rules only', () => {
  expect(
    HOME_EXAMPLES.flatMap(({ rules }) => rules.map(({ kind }) => kind)),
  ).toEqual(['threshold', 'threshold'])
})

test("each example's first-year E&G savings is set against that year's shortfall", () => {
  const records = [
    unclassifiedJob({
      payDepartment: { code: UNIT, name: 'CAS Biology' },
      eeoCategory: 'Other Professionals',
      annualSalaryRateCents: 30_000_000,
    }),
  ]
  // All 30,000,000 of census pay is E&G, so the job's share is 100%.
  const budget = scenarioBudget([
    budgetRow({
      org: UNIT,
      fund: 'EG0001',
      accountType: '61',
      totalExpenditureBudgetCents: 30_000_000,
    }),
  ])
  const answers = exampleAnswers({
    census: toDepartmentCensus({ year: 2025, records }, budget),
    budget,
    rates: {
      ...RATES,
      opeRates: RATES.opeRates.map((rate) => ({ ...rate, fiscalYear: 2027 })),
    },
    projection: {
      ...TEST_PROJECTION,
      runRateCents: [100, -16_065_000, -20_000_000],
    },
    censusFiscalYear: 2026,
    raiseRates: raiseRates(
      [acrossTheBoardTerm('United Academics', 500, '2026-09-01')],
      2027,
    ),
  })
  // 10% of the 10,000,000 over $200,000, and all 5,000,000 over $250,000, each x 0.9 (leave) x 1.7 (OPE),
  // then x 1.05, the career instructor's FY27 raise: 1,530,000 and 7,650,000 become 1,606,500 and 8,032,500.
  expect(
    answers.map(({ fiscalYear, savingsCents, gapShare }) => ({
      fiscalYear,
      savingsCents,
      gapShare,
    })),
  ).toEqual([
    { fiscalYear: 2027, savingsCents: 1_606_500, gapShare: 0.1 },
    { fiscalYear: 2027, savingsCents: 8_032_500, gapShare: 0.5 },
  ])
})

test('jobs per census are the summed file records, oldest first', () => {
  const entry = (year: number, records: number[]) => ({
    year,
    censusDate: `${year}-11-01`,
    sourcePage: 'https://example.org',
    files: records.map((count) => fallFile({ records: count })),
  })
  const manifest: Manifest = {
    fall: [entry(2025, [10, 5]), entry(2014, [3])],
    budget: [],
    rates: null,
  }
  expect(jobsByCensus(manifest)).toEqual([
    { year: 2014, jobs: 3 },
    { year: 2025, jobs: 15 },
  ])
})

test('an area sums its units’ budget and its placed jobs, and each job’s placement is counted', () => {
  const budget = scenarioBudget([
    budgetRow({
      org: UNIT,
      fund: 'EG0001',
      accountType: '61',
      totalExpenditureBudgetCents: 40_000,
    }),
  ])
  const records = [
    classifiedJob({ payDepartment: { code: UNIT, name: 'CAS Biology' } }),
    classifiedJob({
      name: 'Roe, Bo',
      payDepartment: { code: '223500', name: 'CAS Math' },
    }),
    classifiedJob({
      name: 'Poe, Cy',
      payDepartment: { code: '999999', name: 'Zed Ops' },
    }),
  ]
  const census = toDepartmentCensus({ year: 2025, records }, budget)
  // Two jobs are under the three a spend needs.
  expect(areaFigures(census, budget)).toEqual([
    {
      code: AREA,
      name: 'Arts & Sciences',
      budgetCents: 40_000,
      jobs: 2,
      spendCents: null,
    },
    {
      code: null,
      name: UNASSIGNED_AREA,
      budgetCents: null,
      jobs: 1,
      spendCents: null,
    },
  ])
  expect(placementBases(census)).toEqual({
    published: 1,
    name: 1,
    hand: 0,
    unassigned: 1,
  })
})

test('the top-paid jobs are the highest rates, ties by name, without temporaries or possible students', () => {
  const rated = (name: string, cents: number, possibleStudent = false) =>
    unclassifiedJob({ name, annualSalaryRateCents: cents, possibleStudent })
  const top = topPaidJobs(
    {
      year: 2025,
      records: [
        rated('Low, Al', 10_000_000),
        rated('Zed, Zoe', 50_000_000),
        TEMP,
        rated('Student, Sam', 80_000_000, true),
        rated('Abe, Ada', 50_000_000),
      ],
    },
    2,
  )
  expect(top.map(({ name }) => name)).toEqual(['Abe, Ada', 'Zed, Zoe'])
})

test('area bars keep the largest with a value, largest first, ties by name', () => {
  const area = (name: string, budgetCents: number | null, jobs: number) => ({
    code: name,
    name,
    budgetCents,
    jobs,
    spendCents: null,
  })
  const areas = [area('B', 10, 5), area('A', null, 9), area('C', 30, 5)]
  expect(areaBars(areas, 'budget', 3).map(({ name }) => name)).toEqual([
    'C',
    'B',
  ])
  expect(areaBars(areas, 'jobs', 2).map(({ name }) => name)).toEqual(['A', 'B'])
  expect(areaBars(areas, 'spend', 3)).toEqual([])
})

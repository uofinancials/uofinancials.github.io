import { expect, test } from 'vitest'
import type { BudgetYear } from '@/data/budget'
import { toDepartmentCensus } from '@/lib/departments/jobs'
import { census, classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { areaTrends } from './area-trends'
import { continuingPairs } from './pay-changes'

const BUDGET: BudgetYear = {
  fiscalYear: 2026,
  period: '12',
  orgs: {
    '222000': { name: 'Arts & Sciences, College of', level: 3, parent: null },
    '480000': { name: 'Athletics', level: 3, parent: null },
    '223100': { name: 'CAS Biology', level: 5, parent: '222000' },
    '222050': { name: 'CAS English', level: 5, parent: '222000' },
    '480100': { name: 'Athletics Ops', level: 5, parent: '480000' },
  },
  funds: {},
  fundTypes: {},
  accountTypes: {},
  rows: [],
}

const BIOLOGY = { code: '223100', name: 'CAS Biology' }
const ENGLISH = { code: '222050', name: 'CAS English' }

function jobs(
  names: string[],
  overrides: Parameters<typeof unclassifiedJob>[0],
) {
  return names.map((name) => unclassifiedJob({ ...overrides, name }))
}

const FALL_2024 = [
  ...jobs(['A', 'B', 'C'], { payDepartment: BIOLOGY }),
  ...jobs(['E1'], { payDepartment: ENGLISH, apptPercent: 50 }),
  classifiedJob({
    name: 'X',
    payDepartment: { code: '480000', name: 'Athletics' },
  }),
]
const FALL_2025 = [
  ...jobs(['A', 'B', 'C'], {
    payDepartment: BIOLOGY,
    annualSalaryRateCents: 6_000_000,
  }),
  ...jobs(['E1', 'E2', 'E3'], { payDepartment: ENGLISH }),
]

const AREAS = areaTrends(
  [
    toDepartmentCensus({ year: 2024, records: FALL_2024 }, BUDGET),
    toDepartmentCensus({ year: 2025, records: FALL_2025 }, BUDGET),
  ],
  continuingPairs([census(2024, FALL_2024), census(2025, FALL_2025)]),
)

test('an area’s jobs are those each census places in it, by group, and a unit’s those paid under its code', () => {
  const [arts] = AREAS
  expect(arts?.trends.total).toEqual([
    {
      year: 2024,
      jobs: 4,
      spendCents: 17_500_000,
      fteHundredths: 350,
      medianRateCents: 5_000_000,
    },
    {
      year: 2025,
      jobs: 6,
      spendCents: 33_000_000,
      fteHundredths: 600,
      medianRateCents: 5_500_000,
    },
  ])
  expect(arts?.trends.series.map(({ key }) => key)).toEqual(['Faculty'])
  expect(arts?.units.map(({ name }) => name)).toEqual([
    'CAS Biology',
    'CAS English',
  ])
  expect(arts?.units[1]?.trends.total).toEqual([
    {
      year: 2024,
      jobs: 1,
      spendCents: null,
      fteHundredths: 50,
      medianRateCents: null,
    },
    {
      year: 2025,
      jobs: 3,
      spendCents: 15_000_000,
      fteHundredths: 300,
      medianRateCents: 5_000_000,
    },
  ])
})

test('a pair counts where its earlier job is, and a median needs three pairs', () => {
  const [arts] = AREAS
  expect(arts?.payChanges[0]?.points).toEqual([
    { fromYear: 2024, pairs: 4, median: 0.2 },
  ])
  const [biology, english] = arts?.units ?? []
  expect(biology?.payChanges[0]?.points[0]?.median).toBeCloseTo(0.2)
  expect(english?.payChanges[0]?.points).toEqual([
    { fromYear: 2024, pairs: 1, median: null },
  ])
})

test('a unit with no job in any census is left out, and an area keeps a census with none', () => {
  const [, athletics] = AREAS
  expect(athletics?.code).toBe('480000')
  expect(athletics?.units).toEqual([])
  expect(athletics?.trends.total.map(({ jobs }) => jobs)).toEqual([1, 0])
})

test('no census gives no areas', () => {
  expect(areaTrends([], [])).toEqual([])
})

import { expect, test } from 'vitest'
import type { BudgetYear } from '@/data/budget'
import { toDepartmentCensus } from '@/lib/departments/jobs'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { areaTrends } from './area-trends'

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

function jobs(count: number, overrides: Parameters<typeof unclassifiedJob>[0]) {
  return Array.from({ length: count }, () => unclassifiedJob(overrides))
}

const CENSUSES = [
  toDepartmentCensus(
    {
      year: 2024,
      records: [
        ...jobs(3, { payDepartment: BIOLOGY }),
        unclassifiedJob({ payDepartment: ENGLISH, apptPercent: 50 }),
        classifiedJob({ payDepartment: { code: '480000', name: 'Athletics' } }),
      ],
    },
    BUDGET,
  ),
  toDepartmentCensus(
    {
      year: 2025,
      records: [
        ...jobs(2, {
          payDepartment: BIOLOGY,
          annualSalaryRateCents: 6_000_000,
        }),
        ...jobs(3, { payDepartment: ENGLISH }),
      ],
    },
    BUDGET,
  ),
]

test('an area’s figures are the jobs each census places in it, and a unit’s those paid under its code', () => {
  const [arts] = areaTrends(CENSUSES)
  expect(arts?.points).toEqual([
    {
      year: 2024,
      jobs: 4,
      spendCents: 17_500_000,
      fteHundredths: 350,
      medianRateCents: 5_000_000,
    },
    {
      year: 2025,
      jobs: 5,
      spendCents: 27_000_000,
      fteHundredths: 500,
      medianRateCents: 5_000_000,
    },
  ])
  expect(arts?.units).toEqual([
    {
      ...BIOLOGY,
      points: [
        {
          year: 2024,
          jobs: 3,
          spendCents: 15_000_000,
          fteHundredths: 300,
          medianRateCents: 5_000_000,
        },
        {
          year: 2025,
          jobs: 2,
          spendCents: null,
          fteHundredths: 200,
          medianRateCents: null,
        },
      ],
    },
    {
      ...ENGLISH,
      points: [
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
      ],
    },
  ])
})

test('a unit with no job in any census is left out, and an area keeps a census with none', () => {
  const [, athletics] = areaTrends(CENSUSES)
  expect(athletics?.code).toBe('480000')
  expect(athletics?.units).toEqual([])
  expect(athletics?.points.map(({ jobs }) => jobs)).toEqual([1, 0])
})

test('no census gives no areas', () => {
  expect(areaTrends([])).toEqual([])
})

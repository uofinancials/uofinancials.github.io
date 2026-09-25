import { expect, test } from 'vitest'
import type { BudgetYear } from '@/data/budget'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { createAreaAssigner } from './areas'
import {
  type DepartmentCensus,
  departmentClasses,
  departmentTrends,
  departmentYears,
} from './department-jobs'

const ORGS: BudgetYear['orgs'] = {
  '222000': { name: 'Arts & Sciences, College of', level: 3, parent: null },
  '223100': { name: 'CAS Biology', level: 5, parent: '222000' },
}

const biology = { code: '223100', name: 'CAS Biology' }
const math = { code: '223500', name: 'CAS Mathematics Operations' }
const elsewhere = { code: '999999', name: 'Zz Nowhere' }

function census(
  year: number,
  records: DepartmentCensus['records'],
): DepartmentCensus {
  const assign = createAreaAssigner(records, ORGS, year)
  return { year, records, fiscalYear: 2026, orgs: ORGS, assign }
}

function classRows(records: DepartmentCensus['records']) {
  const jobs = departmentYears('111111', [census(2025, records)])
  return departmentClasses(jobs, { kind: 'all', year: 2025 })
}

const CENSUSES = [
  census(2025, [
    unclassifiedJob({ payDepartment: biology }),
    unclassifiedJob({ payDepartment: math }),
    classifiedJob({ payDepartment: elsewhere }),
  ]),
  census(2024, [unclassifiedJob({ payDepartment: math })]),
]

test('a pay department’s jobs are those paid under its code, per census', () => {
  const { years, placements } = departmentYears('223500', CENSUSES)
  expect(years.map(({ year, records }) => [year, records.length])).toEqual([
    [2024, 1],
    [2025, 1],
  ])
  expect(placements).toBeNull()
})

test('an area’s jobs are those the assigner places in it, with how', () => {
  const { years, placements } = departmentYears('222000', CENSUSES)
  expect(years.map(({ records }) => records.length)).toEqual([1, 2])
  expect(placements).toEqual([
    {
      year: 2024,
      fiscalYear: 2026,
      bases: { published: 0, name: 1, hand: 0 },
      unassignedSiteWide: 0,
    },
    {
      year: 2025,
      fiscalYear: 2026,
      bases: { published: 1, name: 1, hand: 0 },
      unassignedSiteWide: 1,
    },
  ])
})

const rank = (rankName: string, annualSalaryRateCents: number) =>
  unclassifiedJob({ rank: rankName, annualSalaryRateCents })

test('classes of three or more jobs get a row; smaller ones fold into one row per kind', () => {
  expect(
    classRows([
      rank('Professor', 10_000_000),
      rank('Professor', 12_000_000),
      rank('Professor', 20_000_000),
      rank('Instructor', 5_000_000),
      rank('Instructor', 6_000_000),
      rank('Lecturer', 7_000_000),
      classifiedJob(),
      classifiedJob({ positionClass: null }),
    ]),
  ).toEqual({
    unclassified: [
      {
        label: 'Professor',
        jobs: 3,
        fteHundredths: 300,
        spendCents: 42_000_000,
        medianRateCents: 12_000_000,
      },
      {
        label: 'Other ranks (fewer than 3 jobs each)',
        jobs: 3,
        fteHundredths: 300,
        spendCents: 18_000_000,
        medianRateCents: 6_000_000,
      },
    ],
    classified: [
      {
        label: 'Other position classes (fewer than 3 jobs each)',
        jobs: 2,
        fteHundredths: 200,
        spendCents: null,
        medianRateCents: null,
      },
    ],
  })
})

test('a class of temporaries shows FTE but no spend', () => {
  const temp = classifiedJob({
    apptPercent: 10,
    positionClass: { code: 'TS401', title: 'Temp' },
  })
  expect(classRows([temp, temp, temp]).classified).toEqual([
    {
      label: 'TS401 Temp',
      jobs: 3,
      fteHundredths: 30,
      spendCents: null,
      medianRateCents: null,
    },
  ])
})

test('trend points under three jobs lose spend and median, keeping FTE', () => {
  const jobs = departmentYears('111111', [
    census(2025, [unclassifiedJob(), unclassifiedJob(), classifiedJob()]),
  ])
  const trends = departmentTrends(jobs, 'all')
  expect(trends.series[0]?.points[0]).toMatchObject({
    jobs: 2,
    spendCents: null,
    fteHundredths: 200,
    medianRateCents: null,
  })
  expect(trends.total[0]).toMatchObject({ jobs: 3, spendCents: 15_000_000 })
})

test('job figures span the censuses with jobs, and the kind filter applies to both views', () => {
  const jobs = departmentYears('223500', [
    ...CENSUSES,
    census(2023, [unclassifiedJob({ payDepartment: elsewhere })]),
  ])
  expect(departmentTrends(jobs, 'all').total.map(({ year }) => year)).toEqual([
    2024, 2025,
  ])
  expect(departmentClasses(jobs, { kind: 'all', year: 2025 })).toMatchObject({
    unclassified: [{ label: 'Other ranks (fewer than 3 jobs each)', jobs: 1 }],
    classified: [],
  })
  expect(
    departmentClasses(jobs, { kind: 'classified', year: 2025 }).unclassified,
  ).toEqual([])
  expect(
    departmentTrends(jobs, 'classified').total.map(({ jobs: count }) => count),
  ).toEqual([0, 0])
})

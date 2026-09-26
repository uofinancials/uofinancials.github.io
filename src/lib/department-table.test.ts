import { expect, test } from 'vitest'
import type { BudgetRow, BudgetYear } from '@/data/budget'
import type { FallRecord } from '@/data/fall'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { toDepartmentCensus } from './department-jobs'
import {
  type DepartmentRow,
  departmentRows,
  filterRows,
  sortRows,
} from './department-table'

function row(org: string, totalCents: number, beginningCents: number) {
  const amounts: BudgetRow = {
    period: '12',
    org,
    fund: 'F00001',
    accountType: '61',
    beginningBudgetCents: beginningCents,
    permAdjustmentsCents: 0,
    permStrategicInitiativeCents: 0,
    totalPermBudgetCents: beginningCents,
    carryForwardCents: 0,
    tempBudgetCents: 0,
    tempStrategicInitiativeCents: 0,
    totalTempBudgetCents: 0,
    totalExpenditureBudgetCents: totalCents,
  }
  return amounts
}

const AREAS = {
  '222000': { name: 'Arts & Sciences, College of', level: 3, parent: null },
  '480000': { name: 'Athletics', level: 3, parent: null },
} as const

function budget(
  fiscalYear: number,
  orgs: BudgetYear['orgs'],
  rows: BudgetRow[],
): BudgetYear {
  return {
    fiscalYear,
    period: '12',
    orgs,
    funds: {},
    fundTypes: {},
    accountTypes: {},
    rows,
  }
}

// CAS English is new in FY26; Athletics Ops' FY25 beginning budget is under the $100,000 floor.
const FY26 = budget(
  2026,
  {
    ...AREAS,
    '223100': { name: 'CAS Biology', level: 5, parent: '222000' },
    '222050': { name: 'CAS English', level: 5, parent: '222000' },
    '480100': { name: 'Athletics Ops', level: 5, parent: '480000' },
  },
  [
    row('223100', 30_000_000, 20_000_000),
    row('222050', 5_000_000, 5_000_000),
    row('480100', 1_000_000, 1_000_000),
  ],
)
const FY25 = budget(
  2025,
  {
    ...AREAS,
    '223100': { name: 'CAS Biology', level: 5, parent: '222000' },
    '480100': { name: 'Athletics Ops', level: 5, parent: '480000' },
  },
  [row('223100', 99_000_000, 16_000_000), row('480100', 5_000_000, 5_000_000)],
)

const BIOLOGY = { code: '223100', name: 'CAS Biology' }
const MATH = { code: '223500', name: 'CAS Mathematics Operations' }
const jobs = (
  count: number,
  payDepartment: FallRecord['payDepartment'],
  annualSalaryRateCents = 5_000_000,
) =>
  Array.from({ length: count }, () =>
    unclassifiedJob({ payDepartment, annualSalaryRateCents }),
  )

const NOW = {
  census: toDepartmentCensus(
    {
      year: 2025,
      records: [
        ...jobs(12, BIOLOGY),
        ...jobs(2, MATH),
        ...Array.from({ length: 3 }, () =>
          classifiedJob({
            payDepartment: { code: '480000', name: 'Athletics' },
          }),
        ),
        classifiedJob({
          payDepartment: { code: '777777', name: 'Qq Unplaced' },
        }),
      ],
    },
    FY26,
  ),
  budget: FY26,
}
const BEFORE = {
  census: toDepartmentCensus(
    {
      year: 2024,
      records: [...jobs(10, BIOLOGY, 4_000_000), ...jobs(9, MATH)],
    },
    FY25,
  ),
  budget: FY25,
}

const { areas, units } = departmentRows(NOW, BEFORE)
const byCode = (rows: DepartmentRow[], code: string | null) =>
  rows.find((found) => found.code === code)
const NO_CHANGES = { budget: null, jobs: null, spend: null, median: null }

test("a unit's budget is its total, its change compares beginning budgets, and census changes compare the year before", () => {
  // Beginning 16,000,000 to 20,000,000; 10 to 12 jobs; spend 40,000,000 to 60,000,000; median 4,000,000 to 5,000,000.
  expect(byCode(units, '223100')).toEqual({
    code: '223100',
    name: 'CAS Biology',
    area: { code: '222000', name: 'Arts & Sciences, College of' },
    budgetCents: 30_000_000,
    jobs: 12,
    spendCents: 60_000_000,
    medianRateCents: 5_000_000,
    changes: { budget: 0.25, jobs: 0.2, spend: 0.5, median: 0.25 },
  })
})

test('a change is blank for a code the earlier year lacks, and under either floor', () => {
  expect(byCode(units, '222050')).toMatchObject({
    budgetCents: 5_000_000,
    jobs: 0,
    changes: NO_CHANGES,
  })
  expect(byCode(units, '480100')?.changes.budget).toBeNull()
  // Nine earlier jobs are under the 10-job floor; two jobs show no spend or median.
  expect(byCode(units, '223500')).toEqual({
    code: '223500',
    name: 'CAS Mathematics Operations',
    area: { code: '222000', name: 'Arts & Sciences, College of' },
    budgetCents: null,
    jobs: 2,
    spendCents: null,
    medianRateCents: null,
    changes: NO_CHANGES,
  })
})

test('an area sums its units and its placed jobs, and its changes compare the jobs placed in it the year before', () => {
  // Beginning 16,000,000 (Biology alone in FY25) to 25,000,000. The earlier
  // census places 19 jobs in the area: spend 85,000,000, median 4,000,000.
  expect(byCode(areas, '222000')).toEqual({
    code: '222000',
    name: 'Arts & Sciences, College of',
    area: null,
    budgetCents: 35_000_000,
    jobs: 14,
    spendCents: 70_000_000,
    medianRateCents: 5_000_000,
    changes: { budget: 0.5625, jobs: -5 / 19, spend: -3 / 17, median: 0.25 },
  })
  expect(byCode(areas, '480000')).toMatchObject({
    jobs: 3,
    changes: NO_CHANGES,
  })
  expect(byCode(units, '480000')).toBeUndefined()
  expect(byCode(units, '777777')?.area).toBeNull()
  expect(byCode(areas, null)).toMatchObject({
    name: 'Area not assigned',
    budgetCents: null,
    jobs: 1,
  })
})

test('blanks sort last in either direction, and ties sort by name', () => {
  const names = (rows: DepartmentRow[]) => rows.map(({ name }) => name)
  const withBlanks = [
    'CAS Biology',
    'Athletics Ops',
    'CAS English',
    'CAS Mathematics Operations',
    'Qq Unplaced',
  ]
  expect(names(sortRows(units, 'budgetChange', 'desc'))).toEqual(withBlanks)
  expect(names(sortRows(units, 'budgetChange', 'asc'))).toEqual(withBlanks)
  expect(names(sortRows(units, 'budget', 'asc'))).toEqual([
    'Athletics Ops',
    'CAS English',
    'CAS Biology',
    'CAS Mathematics Operations',
    'Qq Unplaced',
  ])
  expect(names(sortRows(areas, 'name', 'desc'))).toEqual([
    'Athletics',
    'Arts & Sciences, College of',
    'Area not assigned',
  ])
})

test('the filter keeps rows in the area whose name or code contains the text', () => {
  const codes = (rows: DepartmentRow[]) => rows.map(({ code }) => code)
  expect(codes(filterRows(units, { q: ' math ', area: null }))).toEqual([
    '223500',
  ])
  expect(codes(filterRows(units, { q: '2231', area: null }))).toEqual([
    '223100',
  ])
  expect(codes(filterRows(units, { q: '', area: '480000' }))).toEqual([
    '480100',
  ])
  expect(filterRows(units, { q: 'biology', area: '480000' })).toEqual([])
})

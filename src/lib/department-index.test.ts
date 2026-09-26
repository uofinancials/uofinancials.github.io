import { expect, test } from 'vitest'
import type { BudgetRow, BudgetYear } from '@/data/budget'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { departmentIndex, describeCode } from './department-index'
import { toDepartmentCensus } from './department-jobs'

function row(org: string, cents: number): BudgetRow {
  return {
    period: '14',
    org,
    fund: 'F00001',
    accountType: '61',
    beginningBudgetCents: cents,
    permAdjustmentsCents: 0,
    permStrategicInitiativeCents: 0,
    totalPermBudgetCents: cents,
    carryForwardCents: 0,
    tempBudgetCents: 0,
    tempStrategicInitiativeCents: 0,
    totalTempBudgetCents: 0,
    totalExpenditureBudgetCents: cents,
  }
}

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
  rows: [
    row('223100', 700),
    row('223100', 300),
    row('222050', 500),
    row('480100', 90),
  ],
}

const RECORDS = [
  unclassifiedJob({ payDepartment: { code: '223100', name: 'CAS Biology' } }),
  unclassifiedJob({
    payDepartment: { code: '223500', name: 'CAS Mathematics Operations' },
  }),
  classifiedJob({ payDepartment: { code: '480000', name: 'Athletics' } }),
  classifiedJob({ payDepartment: { code: '777777', name: 'Qq Unplaced' } }),
]

const CENSUS = toDepartmentCensus({ year: 2025, records: RECORDS }, BUDGET)

test('the index lists each area with its units and placed pay departments', () => {
  expect(departmentIndex(CENSUS)).toEqual([
    {
      code: '222000',
      name: 'Arts & Sciences, College of',
      entries: [
        { code: '223100', name: 'CAS Biology' },
        { code: '222050', name: 'CAS English' },
        {
          code: '223500',
          name: 'CAS Mathematics Operations',
        },
      ],
    },
    {
      code: '480000',
      name: 'Athletics',
      entries: [{ code: '480100', name: 'Athletics Ops' }],
    },
    {
      code: null,
      name: 'Area not assigned',
      entries: [{ code: '777777', name: 'Qq Unplaced' }],
    },
  ])
})

test('a code is described by what each source publishes under it', () => {
  const renamed = {
    ...BUDGET,
    fiscalYear: 2021,
    orgs: {
      ...BUDGET.orgs,
      '223100': { name: 'Biology', level: 5 as const, parent: '222000' },
    },
  }
  expect(describeCode('223100', [CENSUS], [renamed, BUDGET])).toEqual({
    code: '223100',
    name: 'CAS Biology',
    otherNames: ['Biology'],
    isArea: false,
    hasBudget: true,
    hasJobs: true,
    area: { code: '222000', name: 'Arts & Sciences, College of' },
  })
  expect(describeCode('223500', [CENSUS], [BUDGET])).toMatchObject({
    hasBudget: false,
    hasJobs: true,
    area: { code: '222000' },
  })
  expect(describeCode('480000', [CENSUS], [BUDGET])).toMatchObject({
    isArea: true,
    hasBudget: true,
    hasJobs: true,
    area: null,
  })
  expect(describeCode('000000', [CENSUS], [BUDGET])).toBeNull()
})

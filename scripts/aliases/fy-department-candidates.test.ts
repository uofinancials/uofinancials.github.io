import { expect, test } from 'vitest'
import type { FallClassified, FallYear } from '../../src/data/fall.ts'
import type { FyYear } from '../../src/data/fy.ts'
import { findFyNameCandidates } from './fy-department-candidates.ts'

function fallJob(
  name: string,
  code: string,
  department: string,
): FallClassified {
  return {
    kind: 'classified',
    name,
    jobType: 'Primary',
    jobStatus: 'Active',
    jobStartDate: '2020-01-01',
    jobEndDate: null,
    homeDepartment: { code: null, name: 'Home' },
    payDepartment: { code, name: department },
    annualSalaryRateCents: 5_000_000,
    apptPercent: 100,
    termOfServiceMonths: 12,
    eeoCategory: 'Other/Temp',
    sourcePage: 1,
    jobTitle: 'Helper',
    positionClass: { code: 'TS901', title: 'Temporary Non-Regular' },
  }
}

function fyJob(name: string, payDepartment: string): FyYear['records'][number] {
  return {
    kind: 'classified',
    name,
    jobType: 'Primary',
    jobStatus: 'Active',
    jobStartDate: '2020-01-01',
    jobEndDate: null,
    homeDepartment: payDepartment,
    payDepartment,
    positionClass: { code: 'TS901', title: 'Temporary Non-Regular' },
    termOfServiceMonths: 12,
    totalPayCents: 100_000,
    sourcePage: 2,
    jobTitle: 'Helper',
  }
}

test('lists each unresolved name with its people’s pay departments, units of the same name in any year, and units sharing its first words', () => {
  const falls: FallYear[] = [
    {
      censusDate: '2016-11-01',
      records: [fallJob('Doe, Ann', '222520', 'CAS Asian Studies Operations')],
    },
    {
      censusDate: '2024-11-01',
      records: [
        fallJob('Doe, Ann', '222515', 'CAS Asian Studies'),
        fallJob('Roe, Bo', '222515', 'CAS Asian Studies'),
        fallJob('Poe, Cy', '100001', 'Known Unit'),
      ],
    },
  ]
  const fys: FyYear[] = [
    {
      fiscalYear: 2025,
      records: [
        fyJob('Doe, Ann', 'CAS Asian Studies Operations'),
        fyJob('Roe, Bo', 'CAS Asian Studies Operations'),
        fyJob('Poe, Cy', 'Known Unit'),
      ],
    },
  ]
  expect(findFyNameCandidates(fys, { falls, budgets: [] })).toEqual([
    {
      name: 'CAS Asian Studies Operations',
      fiscalYears: [2025],
      jobs: 2,
      codes: [],
      people: [
        { code: '222515', name: 'CAS Asian Studies', census: 2024, people: 2 },
      ],
      sameName: [
        {
          code: '222520',
          name: 'CAS Asian Studies Operations',
          censuses: [2016],
          budgets: [],
        },
      ],
      prefixUnits: [{ code: '222515', name: 'CAS Asian Studies' }],
    },
  ])
})

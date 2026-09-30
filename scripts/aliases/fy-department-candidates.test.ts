import { expect, test } from 'vitest'
import type { FyYear } from '../../src/data/fy.ts'
import { census, classifiedJob } from '../../src/test/fall-records.ts'
import { findFyNameCandidates } from './fy-department-candidates.ts'

function paidBy(name: string, code: string, department: string) {
  return classifiedJob({ name, payDepartment: { code, name: department } })
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
  const falls = [
    census(2016, [
      paidBy('Doe, Ann', '100020', 'CAS Invented Studies Operations'),
    ]),
    census(2024, [
      paidBy('Doe, Ann', '100015', 'CAS Invented Studies'),
      paidBy('Roe, Bo', '100015', 'CAS Invented Studies'),
      paidBy('Poe, Cy', '100001', 'Known Unit'),
    ]),
  ]
  const fys: FyYear[] = [
    {
      fiscalYear: 2025,
      records: [
        fyJob('Doe, Ann', 'CAS Invented Studies Operations'),
        fyJob('Roe, Bo', 'CAS Invented Studies Operations'),
        fyJob('Poe, Cy', 'Known Unit'),
      ],
    },
  ]
  expect(findFyNameCandidates(fys, { falls, budgets: [] })).toEqual([
    {
      name: 'CAS Invented Studies Operations',
      fiscalYears: [2025],
      jobs: 2,
      codes: [],
      people: [
        {
          code: '100015',
          name: 'CAS Invented Studies',
          census: 2024,
          people: 2,
        },
      ],
      sameName: [
        {
          code: '100020',
          name: 'CAS Invented Studies Operations',
          censuses: [2016],
          budgets: [],
        },
      ],
      prefixUnits: [
        {
          code: '100015',
          name: 'CAS Invented Studies',
          censuses: [2024],
          budgets: [],
        },
      ],
    },
  ])
})

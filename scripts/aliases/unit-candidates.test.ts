import { expect, test } from 'vitest'
import type { BudgetYear } from '../../src/data/budget.ts'
import type { FallClassified, FallYear } from '../../src/data/fall.ts'
import { findUnitCandidates, normalizeUnitName } from './unit-candidates.ts'

function job(
  name: string,
  code: string,
  departmentName: string,
): FallClassified {
  return {
    kind: 'classified',
    name,
    jobType: 'Primary',
    jobStatus: 'Active',
    jobStartDate: '2020-01-01',
    jobEndDate: null,
    homeDepartment: { code: null, name: 'Home' },
    payDepartment: { code, name: departmentName },
    annualSalaryRateCents: 5_000_000,
    apptPercent: 100,
    termOfServiceMonths: 12,
    eeoCategory: 'Secy/Clerical',
    sourcePage: 1,
    possibleStudent: false,
    jobTitle: 'Office Specialist 2',
    positionClass: { code: 'E0104', title: 'Office Specialist 2' },
  }
}

function census(year: number, records: FallYear['records']): FallYear {
  return { censusDate: `${year}-11-01`, records }
}

function budget(orgs: Record<string, string>): BudgetYear {
  return {
    fiscalYear: 2026,
    period: '12',
    orgs: Object.fromEntries(
      Object.entries(orgs).map(([code, name]) => [
        code,
        { name, level: 5, parent: null },
      ]),
    ),
    funds: {},
    fundTypes: {},
    accountTypes: {},
    rows: [],
  }
}

const STAFF = ['Doe, Ann', 'Roe, Bea', 'Poe, Cy', 'Loe, Di']

test('normalises case, punctuation and the published abbreviations', () => {
  expect(normalizeUnitName('CAS Yamada Lang Ctr & Mgmt Ops')).toBe(
    'cas yamada language center and management operations',
  )
})

test('pairs a census code and a budget code with the same normalised name', () => {
  expect(
    findUnitCandidates(
      [census(2020, [job('Doe, Ann', '630900', 'Rsch Material Sci Ctr')])],
      [budget({ '630899': 'RSCH Material Sci Center' })],
    ),
  ).toEqual([{ codes: ['630899', '630900'], reason: 'same-name' }])
})

test('pairs a code whose name, of three words or more, begins another code name', () => {
  expect(
    findUnitCandidates(
      [
        census(2022, [
          job('Doe, Ann', '222150', 'CAS Yamada Lang Center Operations'),
          job('Roe, Bea', '222149', 'CAS Yamada Language Center'),
        ]),
      ],
      [budget({ '222000': 'CAS Yamada', '222001': 'CAS Yamada Staff' })],
    ),
  ).toEqual([{ codes: ['222149', '222150'], reason: 'name-prefix' }])
})

test('pairs codes when most of one code continuing jobs move to the other', () => {
  const moved = STAFF.slice(0, 3)
  expect(
    findUnitCandidates(
      [
        census(2020, [
          ...moved.map((name) => job(name, '111111', 'Old Unit')),
          job('Loe, Di', '111111', 'Old Unit'),
        ]),
        census(2021, [
          ...moved.map((name) => job(name, '222222', 'New Unit')),
          job('Loe, Di', '111111', 'Old Unit'),
        ]),
      ],
      [],
    ),
  ).toEqual([{ codes: ['111111', '222222'], reason: 'jobs-moved' }])
})

test('does not pair codes when fewer than three jobs move', () => {
  expect(
    findUnitCandidates(
      [
        census(2020, [
          job('Doe, Ann', '111111', 'Old Unit'),
          job('Roe, Bea', '111111', 'Old Unit'),
        ]),
        census(2021, [
          job('Doe, Ann', '222222', 'New Unit'),
          job('Roe, Bea', '222222', 'New Unit'),
        ]),
      ],
      [],
    ),
  ).toEqual([])
})

test('leaves out a budget unit whose staff the census pays under another code in the same years', () => {
  expect(
    findUnitCandidates(
      [census(2021, [job('Doe, Ann', '222555', 'CAS History Operations')])],
      [{ ...budget({ '222554': 'CAS History Ops' }), fiscalYear: 2022 }],
    ),
  ).toEqual([])
})

test('keeps a pay code whose jobs the budget unit code takes over later', () => {
  expect(
    findUnitCandidates(
      [
        census(2020, [job('Doe, Ann', '221160', 'Technology Services')]),
        census(2021, [job('Doe, Ann', '263000', 'Technology Services')]),
      ],
      [{ ...budget({ '263000': 'Technology Services' }), fiscalYear: 2021 }],
    ),
  ).toEqual([{ codes: ['221160', '263000'], reason: 'same-name' }])
})

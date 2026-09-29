import { expect, test } from 'vitest'
import type { FallClassified, FallYear } from '../../src/data/fall.ts'
import { findPersonCandidates } from './person-candidates.ts'

function job(
  name: string,
  overrides: Partial<FallClassified> = {},
): FallClassified {
  return {
    kind: 'classified',
    name,
    jobType: 'Primary',
    jobStatus: 'Active',
    jobStartDate: '2020-01-01',
    jobEndDate: null,
    homeDepartment: { code: null, name: 'Home' },
    payDepartment: { code: '111111', name: 'Dept' },
    annualSalaryRateCents: 5_000_000,
    apptPercent: 100,
    termOfServiceMonths: 12,
    eeoCategory: 'Secy/Clerical',
    sourcePage: 1,
    possibleStudent: false,
    jobTitle: 'Office Specialist 2',
    positionClass: { code: 'E0104', title: 'Office Specialist 2' },
    ...overrides,
  }
}

function census(year: number, records: FallYear['records']): FallYear {
  return { censusDate: `${year}-11-01`, records }
}

test('pairs a surname change on an unchanged job, earlier name first', () => {
  expect(
    findPersonCandidates([
      census(2021, [job('Roe, Ann B')]),
      census(2020, [job('Doe, Ann B')]),
    ]),
  ).toEqual([
    { names: ['Doe, Ann B', 'Roe, Ann B'], code: '111111', reason: 'same-job' },
  ])
})

test('does not pair an unchanged job whose surname and given name both change', () => {
  expect(
    findPersonCandidates([
      census(2020, [job('Doe, Ann')]),
      census(2021, [job('Roe, Bea')]),
    ]),
  ).toEqual([])
})

test('does not pair a job held by two records in either census', () => {
  expect(
    findPersonCandidates([
      census(2020, [job('Doe, Ann'), job('Poe, Cy')]),
      census(2021, [job('Roe, Ann')]),
    ]),
  ).toEqual([])
})

test('does not pair a name that still appears in the other census', () => {
  expect(
    findPersonCandidates([
      census(2020, [job('Doe, Ann')]),
      census(2021, [
        job('Doe, Ann', { jobStartDate: '2021-01-01' }),
        job('Roe, Ann'),
      ]),
    ]),
  ).toEqual([])
})

test('pairs a spelling variant in one pay department across years', () => {
  expect(
    findPersonCandidates([
      census(2020, [job('Doe, Ann B', { jobStartDate: '2019-01-01' })]),
      census(2023, [job('DOE, ANN', { jobStartDate: '2022-06-01' })]),
    ]),
  ).toEqual([
    { names: ['Doe, Ann B', 'DOE, ANN'], code: '111111', reason: 'spelling' },
  ])
})

test('does not pair spelling variants that appear in the same census', () => {
  expect(
    findPersonCandidates([
      census(2020, [
        job('Doe, Ann B'),
        job('Doe, Ann C', { jobStartDate: '2018-01-01' }),
      ]),
    ]),
  ).toEqual([])
})

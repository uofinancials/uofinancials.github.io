import { expect, test } from 'vitest'
import type { FallClassified, FallYear } from '../../src/data/fall.ts'
import {
  differsByFewLetters,
  differsOnlyByInitial,
  findPersonCandidates,
  keepsGivenNames,
} from './person-candidates.ts'

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

test('pairs a surname change on an unchanged job whose middle initial changes, earlier name first', () => {
  expect(
    findPersonCandidates([
      census(2021, [job('Roe, Ann C')]),
      census(2020, [job('Doe, Ann B')]),
    ]),
  ).toEqual([
    { names: ['Doe, Ann B', 'Roe, Ann C'], code: '111111', reason: 'same-job' },
  ])
})

test('does not offer a surname change that keeps the given name and middle initial', () => {
  expect(
    findPersonCandidates([
      census(2020, [job('Doe, Ann B')]),
      census(2021, [job('Roe, Ann Beth')]),
    ]),
  ).toEqual([])
})

test('keepsGivenNames needs a new surname and the same given name and middle initial', () => {
  expect(keepsGivenNames('Doe, Ann B', 'Roe-Doe, Ann B.')).toBe(true)
  expect(keepsGivenNames('Doe, Ann', 'Roe, Ann')).toBe(false)
  expect(keepsGivenNames('Doe, Ann B', 'Roe, Ann')).toBe(false)
  expect(keepsGivenNames('Doe, Ann B', 'Doe, Ann B')).toBe(false)
  expect(keepsGivenNames('Doe, Ann B', 'Roe, Anna B')).toBe(false)
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

test('pairs names in one pay department whose middle initials differ, across years', () => {
  expect(
    findPersonCandidates([
      census(2020, [job('Doe, Ann B', { jobStartDate: '2019-01-01' })]),
      census(2023, [job('Doe, Ann C', { jobStartDate: '2022-06-01' })]),
    ]),
  ).toEqual([
    { names: ['Doe, Ann B', 'Doe, Ann C'], code: '111111', reason: 'spelling' },
  ])
})

test('does not offer a spelling variant that only adds a middle initial', () => {
  expect(
    findPersonCandidates([
      census(2020, [job('Doe, Ann', { jobStartDate: '2019-01-01' })]),
      census(2023, [job('DOE, ANN B', { jobStartDate: '2022-06-01' })]),
    ]),
  ).toEqual([])
})

test('differsOnlyByInitial ignores case, punctuation and an initial on one name only', () => {
  expect(
    differsOnlyByInitial('Al-Samani, Lailek I', 'Alsamani, Lailek I'),
  ).toBe(true)
  expect(
    differsOnlyByInitial('Baker, EmilyClare P', 'Baker, Emily-Clare'),
  ).toBe(true)
  expect(differsOnlyByInitial('Doe, Ann B', 'Doe, Ann C')).toBe(false)
  expect(differsOnlyByInitial('Doe, Ann', 'Doe, Anna')).toBe(false)
})

test('differsByFewLetters allows two letters in one of the surname or given name', () => {
  expect(differsByFewLetters('Turner, Mathew W', 'Turner, Matthew W')).toBe(
    true,
  )
  expect(differsByFewLetters('Mondloch, Kate', 'Mondloch, Katie')).toBe(true)
  expect(differsByFewLetters('Wilson, Emmett R', 'Wilson, Emma R')).toBe(false)
  expect(differsByFewLetters('Bruno, Charlotte E', 'Bruno, Charlotte F')).toBe(
    false,
  )
  expect(differsByFewLetters('Doe, Kate', 'Roe, Katie')).toBe(false)
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

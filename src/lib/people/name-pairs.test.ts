import { expect, test } from 'vitest'
import type { FallClassified } from '@/data/fall'
import { census, classifiedJob } from '@/test/fall-records'
import {
  changesMiddleInitial,
  differsByFewLetters,
  findNamePairs,
  isLinkedByRule,
  keepsGivenNames,
} from './name-pairs'

function job(
  name: string,
  overrides: Partial<FallClassified> = {},
): FallClassified {
  return classifiedJob({ name, ...overrides })
}

/** The pairs no rule links, which a hand review decides. */
function unreviewedPairs(years: Parameters<typeof findNamePairs>[0]) {
  return findNamePairs(years).filter((pair) => !isLinkedByRule(pair))
}

test('keepsGivenNames needs a new surname and the same given name and middle initial', () => {
  expect(keepsGivenNames('Doe, Ann B', 'Roe-Doe, Ann B.')).toBe(true)
  expect(keepsGivenNames('Doe, Ann', 'Roe, Ann')).toBe(false)
  expect(keepsGivenNames('Doe, Ann B', 'Roe, Ann')).toBe(false)
  expect(keepsGivenNames('Doe, Ann B', 'Doe, Ann B')).toBe(false)
  expect(keepsGivenNames('Doe, Ann B', 'Roe, Anna B')).toBe(false)
})

test('changesMiddleInitial needs the same surname and given name and two different initials', () => {
  expect(changesMiddleInitial('Bruno, Charlotte E', 'Bruno, Charlotte F')).toBe(
    true,
  )
  expect(changesMiddleInitial('Bruno, Charlotte E', 'Bruno, Charlotte')).toBe(
    false,
  )
  expect(changesMiddleInitial('Bruno, Charlotte E', 'Brown, Charlotte F')).toBe(
    false,
  )
})

test('differsByFewLetters with no letter changed ignores case, punctuation, and an initial on one name only', () => {
  expect(differsByFewLetters('Al-Samani, Lailek I', 'Alsamani, Lailek I')).toBe(
    true,
  )
  expect(differsByFewLetters('Baker, EmilyClare P', 'Baker, Emily-Clare')).toBe(
    true,
  )
  expect(differsByFewLetters('Doe, Ann B', 'Doe, Ann C')).toBe(false)
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

test('pairs a surname change on an unchanged job whose middle initial changes, earlier name first', () => {
  expect(
    unreviewedPairs([
      census(2021, [job('Roe, Ann C')]),
      census(2020, [job('Doe, Ann B')]),
    ]),
  ).toEqual([
    { names: ['Doe, Ann B', 'Roe, Ann C'], code: '111111', reason: 'same-job' },
  ])
})

test('does not offer a surname change that keeps the given name and middle initial', () => {
  expect(
    unreviewedPairs([
      census(2020, [job('Doe, Ann B')]),
      census(2021, [job('Roe, Ann Beth')]),
    ]),
  ).toEqual([])
})

test('does not pair an unchanged job whose surname and given name both change', () => {
  expect(
    unreviewedPairs([
      census(2020, [job('Doe, Ann')]),
      census(2021, [job('Roe, Bea')]),
    ]),
  ).toEqual([])
})

test('does not pair a job held by two records in either census', () => {
  expect(
    unreviewedPairs([
      census(2020, [job('Doe, Ann'), job('Poe, Cy')]),
      census(2021, [job('Roe, Ann')]),
    ]),
  ).toEqual([])
})

test('pairs an unchanged job by its published code where the fold joins it to a unit with the same job', () => {
  const department = (publishedCode: string) => ({
    code: '222222',
    name: 'Joined',
    publishedCode,
  })
  expect(
    findNamePairs([
      census(2020, [
        job('Doe, Ann B', { payDepartment: department('111111') }),
        job('Poe, Cy', { payDepartment: department('333333') }),
      ]),
      census(2021, [
        job('Roe, Ann B', { payDepartment: department('111111') }),
        job('Poe, Cy', { payDepartment: department('333333') }),
      ]),
    ]),
  ).toEqual([
    { names: ['Doe, Ann B', 'Roe, Ann B'], code: '222222', reason: 'same-job' },
  ])
})

test('does not pair a name that still appears in the other census', () => {
  expect(
    unreviewedPairs([
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
    unreviewedPairs([
      census(2020, [job('Doe, Ann B', { jobStartDate: '2019-01-01' })]),
      census(2023, [job('Doe, Ann C', { jobStartDate: '2022-06-01' })]),
    ]),
  ).toEqual([
    { names: ['Doe, Ann B', 'Doe, Ann C'], code: '111111', reason: 'spelling' },
  ])
})

test('does not offer a spelling variant that only adds a middle initial', () => {
  expect(
    unreviewedPairs([
      census(2020, [job('Doe, Ann', { jobStartDate: '2019-01-01' })]),
      census(2023, [job('DOE, ANN B', { jobStartDate: '2022-06-01' })]),
    ]),
  ).toEqual([])
})

test('does not offer a changed middle initial on an unchanged job', () => {
  expect(
    unreviewedPairs([
      census(2020, [job('Bruno, Charlotte E')]),
      census(2021, [job('Bruno, Charlotte F')]),
    ]),
  ).toEqual([])
})

test('does not pair spelling variants that appear in the same census', () => {
  expect(
    unreviewedPairs([
      census(2020, [
        job('Doe, Ann B'),
        job('Doe, Ann C', { jobStartDate: '2018-01-01' }),
      ]),
    ]),
  ).toEqual([])
})

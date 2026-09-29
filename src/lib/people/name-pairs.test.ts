import { expect, test } from 'vitest'
import {
  changesMiddleInitial,
  differsByFewLetters,
  differsOnlyByInitial,
  keepsGivenNames,
} from './name-pairs'

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

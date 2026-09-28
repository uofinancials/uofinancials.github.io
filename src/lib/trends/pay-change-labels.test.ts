import { expect, test } from 'vitest'
import { isRankRename, normalizeTitle } from './pay-change-labels'

test('a listed rank rename holds only in its year and direction', () => {
  expect(isRankRename('Instructor', 'Teaching Assistant Professor', 2025)).toBe(
    true,
  )
  expect(isRankRename('Instructor', 'Teaching Assistant Professor', 2024)).toBe(
    false,
  )
  expect(isRankRename('Teaching Assistant Professor', 'Instructor', 2025)).toBe(
    false,
  )
  expect(isRankRename('Assistant Professor', 'Associate Professor', 2025)).toBe(
    false,
  )
})

test('titles compare without case, spacing, punctuation, or listed abbreviations', () => {
  expect(normalizeTitle('Asst  Prof.')).toBe('assistant professor')
  expect(normalizeTitle('Sr. Research Assoc, Lab')).toBe(
    'senior research associate laboratory',
  )
  expect(normalizeTitle('Office Specialist I')).toBe(
    normalizeTitle('Office Specialist 1'),
  )
  expect(normalizeTitle('Office Specialist 1')).not.toBe(
    normalizeTitle('Office Specialist 2'),
  )
  expect(normalizeTitle('Instructor')).not.toBe(
    normalizeTitle('Asst Teaching Professor'),
  )
})

import { expect, test } from 'vitest'
import { formatRoundedDollars, sparseNote } from './format'

test('rounds dollars to three significant digits', () => {
  expect(formatRoundedDollars(176_850_089_500)).toBe('$1.77B')
  expect(formatRoundedDollars(50_481_206_800)).toBe('$505M')
  expect(formatRoundedDollars(-2_277_059_300)).toBe('-$22.8M')
})

test('a series is sparse below two values, naming the label it has', () => {
  expect(sparseNote(['2016', '2017', '2018'], [null, 5, null])).toBe(
    'Only in 2017.',
  )
  expect(sparseNote(['2016', '2017'], [null, null])).toBe('No figures.')
  expect(sparseNote(['2016', '2017', '2018'], [0, null, 5])).toBeNull()
})

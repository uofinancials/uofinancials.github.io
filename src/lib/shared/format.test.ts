import { expect, test } from 'vitest'
import { formatRoundedDollars } from './format'

test('rounds dollars to three significant digits', () => {
  expect(formatRoundedDollars(176_850_089_500)).toBe('$1.77B')
  expect(formatRoundedDollars(50_481_206_800)).toBe('$505M')
  expect(formatRoundedDollars(-2_277_059_300)).toBe('-$22.8M')
})

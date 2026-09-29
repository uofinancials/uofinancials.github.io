import { expect, test } from 'vitest'
import { formatRoundedDollars, tabTitleOf } from './format'

test('rounds dollars to three significant digits', () => {
  expect(formatRoundedDollars(176_850_089_500)).toBe('$1.77B')
  expect(formatRoundedDollars(50_481_206_800)).toBe('$505M')
  expect(formatRoundedDollars(-2_277_059_300)).toBe('-$22.8M')
})

test('names a tab by its parts, most specific first, then the site', () => {
  expect(tabTitleOf('Sources')).toBe('Sources | UO Financials')
  expect(tabTitleOf('Raises', 'Department of English', 'Trends')).toBe(
    'Raises · Department of English · Trends | UO Financials',
  )
})

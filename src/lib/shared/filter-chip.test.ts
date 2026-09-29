import { expect, test } from 'vitest'
import { clearAllOf, filterCountText } from './filter-chip'

test('clearing all merges every chip clear and nothing else', () => {
  expect(
    clearAllOf([
      { text: 'Name: smith', clear: { q: undefined } },
      { text: 'Group: Faculty', clear: { group: undefined, hide: undefined } },
    ]),
  ).toStrictEqual({ q: undefined, group: undefined, hide: undefined })
  expect(clearAllOf([])).toStrictEqual({})
})

test('a folded panel counts its filters in words', () => {
  expect([0, 1, 3].map(filterCountText)).toEqual([
    'No filters',
    '1 filter',
    '3 filters',
  ])
})

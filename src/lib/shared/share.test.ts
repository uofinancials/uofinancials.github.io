import { expect, test } from 'vitest'
import { shareOfLargest } from './share'

test('each value is its share of the largest, and nothing below zero draws', () => {
  expect(shareOfLargest([400, 100, null, 0, -50])).toEqual([1, 0.25, 0, 0, 0])
  expect(shareOfLargest([0, null])).toEqual([0, 0])
  expect(shareOfLargest([])).toEqual([])
})

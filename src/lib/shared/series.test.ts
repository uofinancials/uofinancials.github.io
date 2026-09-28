import { expect, test } from 'vitest'
import {
  belowZeroMarker,
  isAnyBelowZero,
  shareOfLargest,
  sparseNote,
} from './series'

test('a chart is sparse below two valued labels, naming the one it has', () => {
  expect(sparseNote(['2016', '2017', '2018'], [[null, 5, null]])).toBe(
    'Only in 2017.',
  )
  expect(sparseNote(['2016', '2017'], [[null, null]])).toBe('No figures.')
  expect(sparseNote(['2016', '2017', '2018'], [[0, null, 5]])).toBeNull()
  expect(
    sparseNote(
      ['2016', '2017'],
      [
        [1, null],
        [null, 2],
      ],
    ),
  ).toBeNull()
})

test('the below-zero marker is at the first label below zero', () => {
  expect(belowZeroMarker(['FY26', 'FY27'], [1, 0], 'Balance')).toBeUndefined()
  expect(
    belowZeroMarker(['FY26', 'FY27', 'FY28'], [0, -1, -2], 'Balance'),
  ).toEqual({
    x: 'FY27',
    label: 'Balance below zero from FY27',
  })
})

test('each value is its share of the largest, and nothing below zero draws', () => {
  expect(shareOfLargest([400, 100, null, 0, -50])).toEqual([1, 0.25, 0, 0, 0])
  expect(shareOfLargest([0, null])).toEqual([0, 0])
  expect(shareOfLargest([])).toEqual([])
})

test('a chart is below zero when any value in any series is', () => {
  expect(isAnyBelowZero([[0, null], [3]])).toBe(false)
  expect(
    isAnyBelowZero([
      [0, null],
      [3, -1],
    ]),
  ).toBe(true)
})

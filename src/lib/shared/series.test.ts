import { expect, test } from 'vitest'
import {
  belowZeroMarker,
  changeOf,
  isAnyBelowZero,
  rankByChange,
  shareOfLargest,
  sparseNote,
  spreadLabels,
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

test('a change is a fraction of the first figure, and has none from a missing or non-positive one', () => {
  expect(changeOf(80, 100)).toBe(0.25)
  expect(changeOf(null, 100)).toBeNull()
  expect(changeOf(0, 100)).toBeNull()
})

test('labels spread to keep a gap, in their given order, and stay within the range where they fit', () => {
  expect(spreadLabels([50, 10, 12], 10, [0, 100])).toEqual([50, 10, 20])
  expect(spreadLabels([95, 98], 10, [0, 100])).toEqual([90, 100])
  expect(spreadLabels([-5], 10, [0, 100])).toEqual([0])
})

test('changes rank largest first on one axis from the largest fall to the largest rise, without the missing', () => {
  const { zero, ranked } = rankByChange([
    { key: 'A', change: 0.1 },
    { key: 'B', change: null },
    { key: 'C', change: -0.2 },
    { key: 'D', change: 0.6 },
  ])
  expect(zero).toBeCloseTo(0.25)
  expect(ranked.map(({ key }) => key)).toEqual(['D', 'A', 'C'])
  expect(ranked[0]?.offset).toBeCloseTo(0.25)
  expect(ranked[0]?.width).toBeCloseTo(0.75)
  expect(ranked[1]?.offset).toBeCloseTo(0.25)
  expect(ranked[1]?.width).toBeCloseTo(0.125)
  expect(ranked[2]).toMatchObject({ offset: 0, width: 0.25 })
  const rises = rankByChange([
    { key: 'A', change: 0.5 },
    { key: 'B', change: 0.25 },
  ])
  expect(rises.zero).toBe(0)
  expect(rises.ranked.map(({ width }) => width)).toEqual([1, 0.5])
})

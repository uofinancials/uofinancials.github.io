import { expect, test } from 'vitest'
import { compareAnswer, compareLines, compareRows } from './compare'
import type { TrendPoint } from './trends'

function point(
  year: number,
  jobs: number,
  fteHundredths: number | null,
  spendCents: number | null,
): TrendPoint {
  return { year, jobs, spendCents, fteHundredths, medianRateCents: null }
}

const UNIT = {
  key: 'CAS English',
  points: [
    point(2013, 9, 900, 90),
    point(2014, 10, 1000, 100),
    point(2015, 7, 700, 108),
  ],
}
const AREA = {
  key: 'Arts & Sciences',
  points: [point(2014, 100, 10_000, 1000), point(2015, 96, 9600, 1400)],
}
const ALL = {
  key: 'All of UO',
  points: [
    point(2014, 1000, 100_000, 10_000),
    point(2015, 1160, 116_000, 17_100),
  ],
}
const RANGE = { from: 2014, to: 2015 }

test('the unit, its area, and the university index to the first census in the range, the last as the baseline', () => {
  const { lines, unindexed } = compareLines([UNIT, AREA, ALL], 'fte', RANGE)
  expect(lines.map(({ key, isBaseline }) => [key, isBaseline])).toEqual([
    ['CAS English', false],
    ['Arts & Sciences', false],
    ['All of UO', true],
  ])
  expect(lines.map(({ values }) => values[1])).toEqual([
    70,
    96,
    expect.closeTo(116),
  ])
  expect(unindexed).toEqual([])
  const late = {
    key: 'New unit',
    points: [point(2014, 0, null, null), point(2015, 3, 300, 30)],
  }
  expect(compareLines([late, ALL], 'fte', RANGE).unindexed).toEqual([
    'New unit',
  ])
})

test('rows have each code’s last jobs and change, most jobs first, leaving out codes with no job in the range', () => {
  const rows = compareRows(
    [
      { code: '1', name: 'CAS English', points: UNIT.points },
      { code: '2', name: 'Arts & Sciences', points: AREA.points },
      {
        code: '3',
        name: 'Gone',
        points: [point(2014, 0, null, null), point(2015, 0, null, null)],
      },
    ],
    RANGE,
  )
  expect(rows.map(({ name }) => name)).toEqual([
    'Arts & Sciences',
    'CAS English',
  ])
  expect(rows[1]?.jobs).toBe(7)
  expect(rows[1]?.fte).toBeCloseTo(-0.3)
  expect(rows[1]?.spend).toBeCloseTo(0.08)
})

test('the answer sets the unit’s change against its area’s and the university’s', () => {
  expect(compareAnswer([UNIT, AREA, ALL], 'fte', RANGE)).toBe(
    'CAS English: FTE -30.0% since Fall 2014, against -4.0% for Arts & Sciences and +16.0% for All of UO.',
  )
  expect(compareAnswer([ALL], 'spend', RANGE)).toBe(
    'All of UO: salary spend +71.0% since Fall 2014.',
  )
})

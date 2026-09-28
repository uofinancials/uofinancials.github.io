import { expect, test } from 'vitest'
import {
  compareAnswer,
  compareLines,
  compareOptions,
  compareRows,
  inRange,
  lineChanges,
  matchOptions,
} from './compare'
import type { TrendPoint } from './trends'

function point(
  year: number,
  jobs: number,
  fteHundredths: number | null,
  spendCents: number | null,
): TrendPoint {
  return { year, jobs, spendCents, fteHundredths, medianRateCents: null }
}

const RANGE = { from: 2014, to: 2015 }

const [UNIT, AREA, ALL] = inRange(
  [
    {
      code: '222050',
      name: 'CAS English',
      points: [
        point(2013, 9, 900, 90),
        point(2014, 10, 1000, 100),
        point(2015, 7, 700, 108),
      ],
    },
    {
      code: '222000',
      name: 'Arts & Sciences',
      points: [point(2014, 100, 10_000, 1000), point(2015, 96, 9600, 1400)],
    },
    {
      code: '',
      name: 'All of UO',
      points: [
        point(2014, 1000, 100_000, 10_000),
        point(2015, 1160, 116_000, 17_100),
      ],
    },
  ],
  RANGE,
)

if (!UNIT || !AREA || !ALL) throw new Error('Three codes are sliced')

test('slicing keeps each code’s censuses in the range', () => {
  expect(UNIT.points.map(({ year }) => year)).toEqual([2014, 2015])
})

test('the unit, its area, and the university index to their first census, the last as the baseline, labelled by its censuses', () => {
  const { labels, lines, unindexed } = compareLines([UNIT, AREA, ALL], 'fte')
  expect(labels).toEqual(['2014', '2015'])
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
    code: '1',
    name: 'New unit',
    points: [point(2014, 0, null, null), point(2015, 3, 300, 30)],
  }
  expect(compareLines([late, ALL], 'fte').unindexed).toEqual(['New unit'])
})

test('rows have each code’s last jobs and change, most jobs first, leaving out codes with no job', () => {
  const rows = compareRows([
    UNIT,
    AREA,
    {
      code: '3',
      name: 'Gone',
      points: [point(2014, 0, null, null), point(2015, 0, null, null)],
    },
  ])
  expect(rows.map(({ name }) => name)).toEqual([
    'Arts & Sciences',
    'CAS English',
  ])
  expect(rows[1]?.jobs).toBe(7)
  expect(rows[1]?.fte).toBeCloseTo(-0.3)
  expect(rows[1]?.spend).toBeCloseTo(0.08)
})

test('each line’s change is from its first census to its last', () => {
  expect(lineChanges([UNIT, AREA], 'jobs')).toEqual([
    { key: 'CAS English', change: -0.3 },
    { key: 'Arts & Sciences', change: -0.04 },
  ])
})

test('the answer sets the unit’s change against its area’s and the university’s', () => {
  expect(compareAnswer([UNIT, AREA, ALL], 'fte', 2014)).toBe(
    'CAS English: FTE -30.0% since Fall 2014, against -4.0% for Arts & Sciences and +16.0% for All of UO.',
  )
  expect(compareAnswer([ALL], 'spend', 2014)).toBe(
    'All of UO: salary spend +71.0% since Fall 2014.',
  )
})

test('options list every area, then every unit under its area, and match every word typed', () => {
  const options = compareOptions([
    {
      code: '222000',
      name: 'Arts & Sciences',
      points: [],
      units: [
        { code: '222050', name: 'CAS English' },
        { code: '222100', name: 'CAS Romance Languages' },
      ],
    },
    {
      code: '260000',
      name: 'Education, College of',
      points: [],
      units: [{ code: '260100', name: 'Education Studies' }],
    },
  ])
  expect(options.map(({ code }) => code)).toEqual([
    '222000',
    '260000',
    '222050',
    '222100',
    '260100',
  ])
  expect(matchOptions(options, 'english', []).map(({ code }) => code)).toEqual([
    '222050',
  ])
  expect(matchOptions(options, 'educ', []).map(({ code }) => code)).toEqual([
    '260000',
    '260100',
  ])
  expect(
    matchOptions(options, 'cas arts', ['222050']).map(({ code }) => code),
  ).toEqual(['222100'])
  expect(matchOptions(options, '  ', [])).toEqual([])
})

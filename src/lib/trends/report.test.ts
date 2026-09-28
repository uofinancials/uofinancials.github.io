import { expect, test } from 'vitest'
import {
  chainedChange,
  changeTable,
  indexValues,
  raiseRows,
  spendContributions,
  spendShares,
  staffingRatio,
  volumeAndPay,
  volumeAndPayByGroup,
} from './report'
import type { TrendPoint, Trends } from './trends'

function point(
  year: number,
  jobs: number,
  spendCents: number | null,
  fteHundredths: number,
  medianRateCents: number | null,
): TrendPoint {
  return { year, jobs, spendCents, fteHundredths, medianRateCents }
}

const TRENDS: Trends = {
  series: [
    {
      key: 'Faculty',
      points: [
        point(2014, 10, 1000, 1000, 100),
        point(2015, 10, 1500, 1000, 120),
      ],
    },
    {
      key: 'Executives',
      points: [
        point(2014, 1, null, 100, null),
        point(2015, 2, null, 200, null),
      ],
    },
    {
      key: 'Admins and professionals',
      points: [point(2014, 4, 400, 400, 90), point(2015, 6, 900, 600, 100)],
    },
    {
      key: 'Classified temporaries',
      points: [
        point(2014, 5, null, 250, null),
        point(2015, 5, null, 250, null),
      ],
    },
  ],
  total: [point(2014, 20, 1500, 1750, 95), point(2015, 23, 2600, 2050, 110)],
}

test('an index is each value over the first times 100, and a line without a first value above zero has none', () => {
  expect(indexValues([50, 75, null, 25])).toEqual([100, 150, null, 50])
  expect(indexValues([null, 1])).toBeNull()
  expect(indexValues([0, 5])).toBeNull()
  expect(indexValues([])).toBeNull()
})

test('the change table has each group’s change from the first census to the last, then all jobs’', () => {
  const rows = changeTable(TRENDS)
  expect(rows[0]).toEqual({
    key: 'Faculty',
    jobs: 0,
    fte: 0,
    spend: 0.5,
    median: 0.2,
  })
  expect(rows[1]).toEqual({
    key: 'Executives',
    jobs: 1,
    fte: 1,
    spend: null,
    median: null,
  })
  const all = rows.at(-1)
  expect(all?.key).toBe('All jobs')
  expect(all?.jobs).toBeCloseTo(3 / 20)
  expect(all?.spend).toBeCloseTo(1100 / 1500)
  expect(all?.fte).toBeCloseTo(300 / 1750)
  expect(all?.median).toBeCloseTo(15 / 95)
})

test('the staffing ratio counts admins and executives per 100 faculty jobs', () => {
  expect(staffingRatio(TRENDS)).toEqual([50, 80])
  expect(
    staffingRatio({ series: [], total: [point(2014, 1, 1, 1, 1)] }),
  ).toEqual([null])
})

test('spend shares leave out the groups with no spend shown', () => {
  const shares = spendShares(TRENDS, 0)
  expect(shares.map(({ key }) => key)).toEqual([
    'Faculty',
    'Admins and professionals',
  ])
  expect(shares[0]?.share).toBeCloseTo(1000 / 1500)
  expect(shares[1]?.share).toBeCloseTo(400 / 1500)
})

test('each group’s change in spend is a share of the change in all spend, and hidden spend has no share', () => {
  const rows = spendContributions(TRENDS)
  expect(rows.map(({ key }) => key)).toEqual([
    'Faculty',
    'Executives',
    'Admins and professionals',
    'All jobs',
  ])
  expect(rows[0]?.changeCents).toBe(500)
  expect(rows[0]?.share).toBeCloseTo(500 / 1100)
  expect(rows[1]).toEqual({ key: 'Executives', changeCents: null, share: null })
  expect(rows.at(-1)).toEqual({ key: 'All jobs', changeCents: 1100, share: 1 })
})

test('a group with no job at one end counts as no spend there', () => {
  const trends: Trends = {
    series: [
      {
        key: 'Overloads',
        points: [point(2014, 0, null, 0, null), point(2015, 3, 30, 30, null)],
      },
    ],
    total: [point(2014, 3, 60, 60, 1), point(2015, 6, 90, 90, 1)],
  }
  expect(spendContributions(trends)[0]).toEqual({
    key: 'Overloads',
    changeCents: 30,
    share: 1,
  })
})

test('the change in spend splits into more FTE at the first census’s spend per FTE and the rest, temporaries left out', () => {
  const split = volumeAndPay(TRENDS)
  expect(split?.changeCents).toBe(1100)
  expect(split?.volumeCents).toBe(300)
  expect(split?.payCents).toBe(800)
  expect(split?.fteChange).toBeCloseTo(0.2)
  expect(split?.perFteChange).toBeCloseTo(2600 / 1800 - 1)
  expect(volumeAndPay({ series: [], total: [] })).toBeNull()
})

test('each paid group’s change in FTE and in spend per FTE', () => {
  expect(volumeAndPayByGroup(TRENDS)).toEqual([
    { key: 'Faculty', fte: 0, perFte: 0.5 },
    { key: 'Executives', fte: 1, perFte: null },
    { key: 'Admins and professionals', fte: 0.5, perFte: 0.5 },
  ])
})

test('changes chain by compounding, and a missing one leaves no chain', () => {
  expect(chainedChange([0.1, 0.2])).toBeCloseTo(0.32)
  expect(chainedChange([])).toBeNull()
  expect(chainedChange([0.1, null])).toBeNull()
})

test('raise rows pick each line’s median for the pairs asked, and chain them', () => {
  const [row] = raiseRows(
    [
      {
        key: 'All continuing jobs',
        points: [
          { fromYear: 2014, pairs: 10, median: 0.1 },
          { fromYear: 2015, pairs: 10, median: 0.2 },
        ],
      },
    ],
    [2015, 2016],
  )
  expect(row?.medians).toEqual([0.2, null])
  expect(row?.chained).toBeNull()
})

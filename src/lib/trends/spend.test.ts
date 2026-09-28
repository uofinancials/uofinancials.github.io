import { expect, test } from 'vitest'
import { point, TRENDS } from '@/test/trends'
import {
  spendContributions,
  spendShares,
  stepBars,
  volumeAndPay,
  volumeAndPayByGroup,
} from './spend'
import type { Trends } from './trends'

test('spend shares are each group’s share in the first and last census, leaving out the groups with no spend shown', () => {
  const shares = spendShares(TRENDS)
  expect(shares.map(({ key }) => key)).toEqual([
    'Faculty',
    'Admins and professionals',
  ])
  expect(shares[0]?.first).toBeCloseTo(1000 / 1500)
  expect(shares[0]?.last).toBeCloseTo(1500 / 2600)
  expect(shares[1]?.first).toBeCloseTo(400 / 1500)
})

test('each group’s change in spend is a share of the change in all spend, and a group with no spend shown has no row', () => {
  const rows = spendContributions(TRENDS)
  expect(rows.map(({ key }) => key)).toEqual([
    'Faculty',
    'Admins and professionals',
    'All jobs',
  ])
  expect(rows[0]?.changeCents).toBe(500)
  expect(rows[0]?.share).toBeCloseTo(500 / 1100)
  expect(rows.at(-1)).toEqual({ key: 'All jobs', changeCents: 1100, share: 1 })
})

test('spend hidden at one end leaves the change and its share empty', () => {
  const trends: Trends = {
    series: [
      {
        key: 'Executives',
        points: [point(2014, 2, null, 200, null), point(2015, 3, 300, 300, 1)],
      },
    ],
    total: TRENDS.total,
  }
  expect(spendContributions(trends)[0]).toEqual({
    key: 'Executives',
    changeCents: null,
    share: null,
  })
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

test('each group with spend has its change in FTE and in spend per FTE, then all jobs’ from the split', () => {
  const split = volumeAndPay(TRENDS)
  if (!split) throw new Error('The fixture has spend and FTE')
  expect(volumeAndPayByGroup(TRENDS, split)).toEqual([
    { key: 'Faculty', fte: 0, perFte: 0.5 },
    { key: 'Admins and professionals', fte: 0.5, perFte: 0.5 },
    { key: 'All jobs', fte: split.fteChange, perFte: split.perFteChange },
  ])
})

test('step bars start each part where the one before ends, as fractions of the longest reach', () => {
  const bars = stepBars({
    firstCents: 1500,
    fteChange: 0.2,
    perFteChange: 0.4,
    volumeCents: 300,
    payCents: 800,
    changeCents: 1100,
  })
  expect(bars.map(({ key, cents }) => [key, cents])).toEqual([
    ['first', 1500],
    ['volume', 300],
    ['pay', 800],
    ['last', 2600],
  ])
  expect(bars[1]?.offset).toBeCloseTo(1500 / 2600)
  expect(bars[2]?.offset).toBeCloseTo(1800 / 2600)
  expect(bars[2]?.width).toBeCloseTo(800 / 2600)
  expect(bars[3]?.width).toBe(1)
})

test('a fall in spend per FTE draws back from where the FTE part ends', () => {
  const [, , pay] = stepBars({
    firstCents: 1000,
    fteChange: 0.5,
    perFteChange: -0.2,
    volumeCents: 500,
    payCents: -300,
    changeCents: 200,
  })
  expect(pay?.cents).toBe(-300)
  expect(pay?.offset).toBeCloseTo(1200 / 1500)
  expect(pay?.width).toBeCloseTo(300 / 1500)
})

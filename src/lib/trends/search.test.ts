import { expect, test } from 'vitest'
import {
  isSummaryView,
  resolveTrendView,
  seriesWithMetric,
  type TrendsSearch,
  trendsSearchSchema,
} from './search'

const YEARS = [2014, 2015, 2025]

test('an empty search is every listed census, by group, in spend', () => {
  expect(resolveTrendView({}, YEARS)).toEqual({
    metric: 'spend',
    group: null,
    hide: [],
    kind: 'all',
    dept: null,
    area: null,
    position: null,
    from: 2014,
    to: 2025,
    fromYears: [2014],
    pair: 2014,
  })
})

test('a pair outside the range, or without both censuses listed, falls back to the range’s latest', () => {
  const years = [2014, 2015, 2016, 2025]
  const pair = (search: TrendsSearch) => resolveTrendView(search, years).pair
  expect(pair({ pair: 2015 })).toBe(2015)
  expect(pair({ pair: 2016 })).toBe(2015)
  expect(pair({ pair: 2015, to: 2015 })).toBe(2014)
  expect(pair({ from: 2025 })).toBe(2025)
})

test('years are clamped to the listed censuses, and a reversed range to one year', () => {
  expect(resolveTrendView({ from: 2000, to: 2030 }, YEARS)).toMatchObject({
    from: 2014,
    to: 2025,
  })
  expect(resolveTrendView({ from: 2025, to: 2014 }, YEARS)).toMatchObject({
    from: 2025,
    to: 2025,
  })
})

test('malformed params fall back to their defaults', () => {
  expect(
    trendsSearchSchema.parse({
      metric: 'bogus',
      group: 'Faculty',
      kind: 'students',
      from: 'x',
    }),
  ).toEqual({ group: 'Faculty' })
})

test('a metric keeps only the series with a value for it', () => {
  const point = {
    year: 2025,
    spendCents: null,
    jobs: 1,
    fteHundredths: 10,
    medianRateCents: null,
  }
  const series = [{ key: 'Classified temporaries', points: [point] }]
  expect(seriesWithMetric(series, 'fte')).toEqual(series)
  expect(seriesWithMetric(series, 'spend')).toEqual([])
})

test('the summary holds every job under a census measure, whatever the group, years, or hidden lines', () => {
  expect(isSummaryView({})).toBe(true)
  expect(
    isSummaryView({ metric: 'fte', group: 'Faculty', from: 2018, hide: ['x'] }),
  ).toBe(true)
  expect(isSummaryView({ metric: 'change' })).toBe(false)
  expect(isSummaryView({ kind: 'classified' })).toBe(false)
  expect(isSummaryView({ dept: '223100' })).toBe(false)
  expect(isSummaryView({ area: '222000' })).toBe(false)
  expect(isSummaryView({ position: 'E0104' })).toBe(false)
})

import { expect, test } from 'vitest'
import {
  resolveTrendView,
  seriesWithMetric,
  trendsSearchSchema,
} from './trends-search'

const YEARS = [2014, 2015, 2025]

test('an empty search is every listed census, by group, in spend', () => {
  expect(resolveTrendView({}, YEARS)).toEqual({
    metric: 'spend',
    group: null,
    hide: [],
    kind: 'all',
    from: 2014,
    to: 2025,
  })
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
    fteHundredths: 10,
    medianRateCents: null,
  }
  const series = [{ key: 'Classified temporaries', points: [point] }]
  expect(seriesWithMetric(series, 'fte')).toEqual(series)
  expect(seriesWithMetric(series, 'spend')).toEqual([])
})

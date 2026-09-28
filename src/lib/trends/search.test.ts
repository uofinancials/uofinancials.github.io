import { expect, test } from 'vitest'
import {
  resolveReportView,
  resolveTrendView,
  type TrendsSearch,
  trendsSearchSchema,
} from './search'

const YEARS = [2014, 2015, 2025]

test('an empty search is every listed census, by group', () => {
  expect(resolveTrendView({}, YEARS)).toEqual({
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

test('the report reads its years as the pay changes page does, and shows jobs by default', () => {
  expect(resolveReportView({ from: 2015 }, YEARS)).toEqual({
    from: 2015,
    to: 2025,
    fromYears: [],
    growth: 'jobs',
  })
  expect(resolveReportView({ growth: 'median' }, YEARS).growth).toBe('median')
})

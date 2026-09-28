import { expect, test } from 'vitest'
import {
  pickReportParams,
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
    view: 'bars',
    compare: 'fte',
  })
  expect(resolveReportView({ growth: 'median' }, YEARS).growth).toBe('median')
})

test('a report link keeps its years, measures, area, and unit, and nothing else', () => {
  expect(
    pickReportParams({
      from: 2018,
      compare: 'spend',
      area: '222000',
      unit: '222050',
      dept: '223100',
      metric: 'change',
      hide: ['Faculty'],
    }),
  ).toEqual({ from: 2018, compare: 'spend', area: '222000', unit: '222050' })
  expect(trendsSearchSchema.parse({ metric: 'fte' })).toEqual({
    metric: undefined,
  })
})

import { expect, test } from 'vitest'
import {
  payChangeFilters,
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
    measure: 'jobs',
    view: 'bars',
    tab: 'grew',
  })
  expect(resolveReportView({ measure: 'median' }, YEARS).measure).toBe('median')
})

test('a report link keeps its years, measures, area, and unit, and nothing else', () => {
  expect(
    pickReportParams({
      from: 2018,
      measure: 'spend',
      tab: 'raises',
      area: '222000',
      unit: '222050',
      dept: '223100',
      metric: 'change',
      hide: ['Faculty'],
    }),
  ).toEqual({
    from: 2018,
    measure: 'spend',
    tab: 'raises',
    area: '222000',
    unit: '222050',
  })
  expect(trendsSearchSchema.parse({ metric: 'fte' })).toEqual({
    metric: undefined,
  })
})

test('each active pay changes filter reads as a chip; clearing the group shows every line again', () => {
  const view = resolveTrendView(
    { group: 'Faculty', kind: 'unclassified', hide: ['Overloads'] },
    YEARS,
  )
  expect(
    payChangeFilters(view, {
      dept: 'CAS Biology',
      area: 'College of Arts and Sciences',
      position: 'Professor',
    }),
  ).toStrictEqual([
    { text: 'Group: Faculty', clear: { group: undefined, hide: undefined } },
    { text: 'Staff: Unclassified', clear: { kind: undefined } },
    { text: 'Pay department: CAS Biology', clear: { dept: undefined } },
    {
      text: 'College or VP area: College of Arts and Sciences',
      clear: { area: undefined },
    },
    { text: 'Class or rank: Professor', clear: { position: undefined } },
  ])
  expect(
    payChangeFilters(resolveTrendView({ from: 2020 }, YEARS), {
      dept: null,
      area: null,
      position: null,
    }),
  ).toStrictEqual([])
})

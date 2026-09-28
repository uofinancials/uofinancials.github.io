import { expect, test } from 'vitest'
import type { AreaTrends } from '@/data/summary'
import {
  areaOfCode,
  comparedCodes,
  payChangesSearchOf,
  reportScope,
  resolveCompared,
  scopeSearchOf,
} from './scope'

const EMPTY = { trends: { series: [], total: [] }, payChanges: [] }
const ALL = {
  trends: {
    series: [],
    total: [
      {
        year: 2025,
        jobs: 9,
        spendCents: 1,
        fteHundredths: 1,
        medianRateCents: 1,
      },
    ],
  },
  payChanges: [],
}
const AREA: AreaTrends = {
  code: '222000',
  name: 'Arts & Sciences',
  ...EMPTY,
  units: [{ code: '222050', name: 'CAS English', ...EMPTY }],
}

test('the scope is all of UO without an area, the area, or the unit within it', () => {
  expect(reportScope(ALL, null, '222050')).toMatchObject({
    name: 'All of UO',
    trends: ALL.trends,
    area: null,
    unit: null,
  })
  expect(reportScope(ALL, AREA, null)).toMatchObject({
    name: 'Arts & Sciences',
    area: { code: '222000' },
    unit: null,
  })
  expect(reportScope(ALL, AREA, '222050')).toMatchObject({
    name: 'CAS English',
    area: { code: '222000' },
    unit: { code: '222050' },
  })
  expect(reportScope(ALL, AREA, '999999').name).toBe('Arts & Sciences')
})

test('the pay changes filter names the unit’s pay department, or the area, or nothing for all of UO', () => {
  expect(payChangesSearchOf(reportScope(ALL, null, null))).toEqual({})
  expect(payChangesSearchOf(reportScope(ALL, AREA, null))).toEqual({
    area: '222000',
  })
  expect(payChangesSearchOf(reportScope(ALL, AREA, '222050'))).toEqual({
    dept: '222050',
  })
})

test('the scope carries the area’s units and all of UO’s totals', () => {
  const scope = reportScope(ALL, AREA, null)
  expect(scope.units.map(({ code }) => code)).toEqual(['222050'])
  expect(scope.university).toEqual({
    code: '',
    name: 'All of UO',
    points: ALL.trends.total,
  })
})

const AREAS = [
  {
    code: '222000',
    name: 'Arts & Sciences',
    points: [],
    units: [{ code: '222050', name: 'CAS English' }],
  },
  { code: '480000', name: 'Athletics', points: [], units: [] },
]

test('the comparison adds what is asked, or by default a picked unit’s area', () => {
  expect(comparedCodes(reportScope(ALL, AREA, '222050'), undefined)).toEqual([
    '222000',
  ])
  expect(comparedCodes(reportScope(ALL, AREA, '222050'), [])).toEqual([])
  expect(comparedCodes(reportScope(ALL, AREA, null), undefined)).toEqual([])
  expect(comparedCodes(reportScope(ALL, null, null), ['480000'])).toEqual([
    '480000',
  ])
})

test('a code’s trends file is its own for an area and its area’s for a unit', () => {
  expect(areaOfCode(AREAS, '480000')).toBe('480000')
  expect(areaOfCode(AREAS, '222050')).toBe('222000')
  expect(areaOfCode(AREAS, '999999')).toBeNull()
})

test('compared codes resolve to totals from the summary or their area’s file, unknown ones left out', () => {
  expect(
    resolveCompared(['480000', '222050', '999999'], AREAS, [AREA]).map(
      ({ code, name }) => [code, name],
    ),
  ).toEqual([
    ['480000', 'Athletics'],
    ['222050', 'CAS English'],
  ])
})

test('picking an area scopes to it alone, and picking a unit scopes to it within its area', () => {
  expect(scopeSearchOf(AREAS, '480000')).toEqual({
    area: '480000',
    unit: undefined,
  })
  expect(scopeSearchOf(AREAS, '222050')).toEqual({
    area: '222000',
    unit: '222050',
  })
})

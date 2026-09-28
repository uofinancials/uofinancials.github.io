import { expect, test } from 'vitest'
import type { AreaTrends } from '@/data/summary'
import { reportScope } from './scope'

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

import { expect, test } from 'vitest'
import { point, TRENDS } from '@/test/trends'
import {
  chainedChange,
  changeTable,
  heatLevel,
  indexedGroups,
  indexValues,
  raiseRows,
  ratioChange,
  staffingRows,
} from './report'
import type { Trends } from './trends'

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
  expect(all?.fte).toBeCloseTo(300 / 1500)
  expect(all?.median).toBeCloseTo(15 / 95)
})

test('the staffing ratio counts admins and executives per 100 faculty jobs', () => {
  expect(staffingRows(TRENDS)).toEqual([
    { year: 2014, jobs: [4, 1, 10], ratio: 50 },
    { year: 2015, jobs: [6, 2, 10], ratio: 80 },
  ])
  expect(
    staffingRows({ series: [], total: [point(2014, 1, 1, 1, 1)] }),
  ).toEqual([{ year: 2014, jobs: [0, 0, 0], ratio: null }])
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

test('heat levels step up at each bound', () => {
  expect([-0.01, 0, 0.005, 0.03, 0.079, 0.129].map(heatLevel)).toEqual([
    0, 0, 1, 2, 4, 5,
  ])
})

test('indexed groups keep every group’s place, hide those without an index, and end with all jobs as the baseline', () => {
  const { lines, hidden, unindexed } = indexedGroups(TRENDS, 'spend')
  expect(lines.map(({ key }) => key)).toEqual([
    'Faculty',
    'Executives',
    'Admins and professionals',
    'Unclassified staff',
    'Classified staff',
    'Overloads',
    'Category not published',
    'Classified temporaries',
    'All jobs',
  ])
  expect(lines[0]?.values).toEqual([100, 150])
  expect(lines.at(-1)).toEqual({
    key: 'All jobs',
    values: [100, (2600 / 1500) * 100],
    isBaseline: true,
  })
  expect(unindexed).toEqual(['Executives', 'Classified temporaries'])
  expect(hidden).toEqual([
    'Executives',
    'Unclassified staff',
    'Classified staff',
    'Overloads',
    'Category not published',
    'Classified temporaries',
  ])
  expect(indexedGroups(TRENDS, 'jobs').hidden).not.toContain(
    'Classified temporaries',
  )
})

test('a group with no job in the first or the last census has no change row', () => {
  const trends: Trends = {
    series: [
      ...TRENDS.series,
      {
        key: 'Category not published',
        points: [point(2014, 0, null, 0, null), point(2015, 0, null, 0, null)],
      },
    ],
    total: TRENDS.total,
  }
  expect(changeTable(trends).map(({ key }) => key)).not.toContain(
    'Category not published',
  )
})

test('a raise line with no median in the pairs asked is left out', () => {
  expect(
    raiseRows(
      [
        {
          key: 'Category not published',
          points: [{ fromYear: 2017, pairs: 3, median: 0.03 }],
        },
      ],
      [2014],
    ),
  ).toEqual([])
})

test('a ratio change is last less first, and none when either is missing or both are zero', () => {
  expect(ratioChange(12.5, 14)).toBe(1.5)
  expect(ratioChange(14, 12.5)).toBe(-1.5)
  expect(ratioChange(8, 8)).toBe(0)
  expect(ratioChange(0, 3)).toBe(3)
  expect(ratioChange(0, 0)).toBeNull()
  expect(ratioChange(null, 3)).toBeNull()
  expect(ratioChange(3, null)).toBeNull()
})

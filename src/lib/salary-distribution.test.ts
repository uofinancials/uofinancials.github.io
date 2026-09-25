import { expect, test } from 'vitest'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import {
  binLabel,
  binRange,
  buildDistribution,
  filterJobs,
  positionLabel,
} from './salary-distribution'
import { stackedCounts } from './trend-groups'
import { medianRateCents, percentileCents } from './trends'

const temp = classifiedJob({ positionClass: { code: 'TS401', title: null } })
const at = (annualSalaryRateCents: number) =>
  unclassifiedJob({ annualSalaryRateCents })

test('percentiles interpolate between ranks, and the 50th is the median', () => {
  expect(percentileCents([10, 20, 30, 40, 50], 25)).toBe(20)
  expect(percentileCents([10, 20, 30, 40], 25)).toBe(18)
  expect(percentileCents([10, 20, 30, 40], 90)).toBe(37)
  expect(percentileCents([], 50)).toBeNull()
  const rates = [101, 200, 350, 999]
  expect(percentileCents(rates, 50)).toBe(medianRateCents(rates))
})

test('rates fall in $10,000 bins by group, lower bound inclusive, and $250,000 and over share the top bin', () => {
  const { bins, counts, maxRateCents } = buildDistribution(
    [
      at(999_999),
      at(1_000_000),
      at(24_999_999),
      at(25_000_000),
      at(940_000_000),
      temp,
    ],
    2025,
  )
  expect(bins).toHaveLength(26)
  const facultyAt = (floorCents: number) =>
    bins.find((bin) => bin.floorCents === floorCents)?.counts.Faculty
  expect(facultyAt(0)).toBe(1)
  expect(facultyAt(1_000_000)).toBe(1)
  expect(facultyAt(24_000_000)).toBe(1)
  expect(facultyAt(25_000_000)).toBe(2)
  expect(bins.at(-1)?.ceilingCents).toBeNull()
  expect(bins.at(-2)?.ceilingCents).toBe(25_000_000)
  expect(bins[5]?.counts['Classified temporaries']).toBe(1)
  expect(bins[5]?.total).toBe(1)
  expect(counts).toMatchObject({
    Faculty: 5,
    'Classified temporaries': 1,
    'Classified staff': 0,
  })
  expect(maxRateCents).toBe(940_000_000)
})

test('stacks list only the groups with a job, keeping each group’s place', () => {
  const stacks = stackedCounts(buildDistribution([at(100), temp], 2025))
  expect(stacks.map(({ key, position }) => [key, position])).toEqual([
    ['Faculty', 0],
    ['Classified temporaries', 6],
  ])
  expect(stacks[0]?.values[0]).toBe(1)
})

test('percentiles cover primary jobs without temporaries, and need three of them', () => {
  const overload = unclassifiedJob({
    jobType: 'Overload',
    annualSalaryRateCents: 100,
  })
  const secondary = classifiedJob({ jobType: 'Secondary' })
  expect(
    buildDistribution([at(1), at(2), overload, secondary, temp], 2025)
      .percentiles,
  ).toBeNull()
  expect(
    buildDistribution([at(100), at(200), at(300), overload, temp], 2025)
      .percentiles,
  ).toEqual({ 10: 120, 25: 150, 50: 200, 75: 250, 90: 280 })
  expect(buildDistribution([], 2025).maxRateCents).toBeNull()
})

test('jobs filter by group, staff kind, term, and position class or rank', () => {
  const records = [
    unclassifiedJob(),
    unclassifiedJob({ termOfServiceMonths: 12 }),
    classifiedJob(),
    temp,
  ]
  const all = { group: null, kind: 'all', term: null, position: null } as const
  expect(filterJobs(records, all, 2025)).toHaveLength(4)
  expect(filterJobs(records, { ...all, term: 9 }, 2025)).toHaveLength(1)
  expect(
    filterJobs(records, { ...all, kind: 'classified' }, 2025),
  ).toHaveLength(2)
  expect(
    filterJobs(records, { ...all, group: 'Classified temporaries' }, 2025),
  ).toEqual([temp])
  expect(filterJobs(records, { ...all, position: 'E0104' }, 2025)).toEqual([
    records[2],
  ])
  expect(
    filterJobs(records, { ...all, position: 'Instructor' }, 2025),
  ).toHaveLength(2)
})

test('a position reads as its class title and code, or as the rank', () => {
  const records = [classifiedJob(), unclassifiedJob()]
  expect(positionLabel(records, 'E0104')).toBe('Office Specialist 2 (E0104)')
  expect(positionLabel(records, 'Instructor')).toBe('Instructor')
})

test('bins are labelled by their floor, and the top bin is open', () => {
  const [first, ...rest] = buildDistribution([], 2025).bins
  const top = rest.at(-1)
  if (!first || !top) throw new Error('no bins')
  expect([binLabel(first), binRange(first)]).toEqual(['$0', '$0 to $9,999'])
  expect([binLabel(top), binRange(top)]).toEqual([
    '$250K+',
    '$250,000 and over',
  ])
  expect(rest[4] && binLabel(rest[4])).toBe('$50K')
})

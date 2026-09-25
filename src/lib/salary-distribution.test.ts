import { expect, test } from 'vitest'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import {
  binLabel,
  binRange,
  buildDistribution,
  filterJobs,
  jobKindOf,
  percentileCents,
} from './salary-distribution'
import { medianRateCents } from './trends'

const temp = classifiedJob({ positionClass: { code: 'TS401', title: null } })
const at = (annualSalaryRateCents: number) =>
  unclassifiedJob({ annualSalaryRateCents })

test('each job is primary, secondary or overload, or a classified temporary', () => {
  expect(jobKindOf(unclassifiedJob())).toBe('Primary jobs')
  expect(jobKindOf(unclassifiedJob({ jobType: 'Overload' }))).toBe(
    'Secondary and overload jobs',
  )
  expect(jobKindOf(classifiedJob({ jobType: 'Secondary' }))).toBe(
    'Secondary and overload jobs',
  )
  expect(jobKindOf(temp)).toBe('Classified temporaries')
})

test('percentiles interpolate between ranks, and the 50th is the median', () => {
  expect(percentileCents([10, 20, 30, 40, 50], 25)).toBe(20)
  expect(percentileCents([10, 20, 30, 40], 25)).toBe(18)
  expect(percentileCents([10, 20, 30, 40], 90)).toBe(37)
  expect(percentileCents([], 50)).toBeNull()
  const rates = [101, 200, 350, 999]
  expect(percentileCents(rates, 50)).toBe(medianRateCents(rates))
})

test('rates fall in $10,000 bins with the lower bound inclusive, and $250,000 and over share the top bin', () => {
  const { bins, counts, maxRateCents } = buildDistribution([
    at(999_999),
    at(1_000_000),
    at(24_999_999),
    at(25_000_000),
    at(940_000_000),
    temp,
  ])
  expect(bins).toHaveLength(26)
  const primaryAt = (floorCents: number) =>
    bins.find((bin) => bin.floorCents === floorCents)?.counts['Primary jobs']
  expect(primaryAt(0)).toBe(1)
  expect(primaryAt(1_000_000)).toBe(1)
  expect(primaryAt(24_000_000)).toBe(1)
  expect(primaryAt(25_000_000)).toBe(2)
  expect(bins.at(-1)?.ceilingCents).toBeNull()
  expect(bins.at(-2)?.ceilingCents).toBe(25_000_000)
  expect(bins[5]?.counts['Classified temporaries']).toBe(1)
  expect(counts).toEqual({
    'Primary jobs': 5,
    'Secondary and overload jobs': 0,
    'Classified temporaries': 1,
  })
  expect(maxRateCents).toBe(940_000_000)
})

test('percentiles cover primary jobs only, and need three of them', () => {
  const overload = unclassifiedJob({
    jobType: 'Overload',
    annualSalaryRateCents: 100,
  })
  expect(
    buildDistribution([at(1), at(2), overload, temp]).percentiles,
  ).toBeNull()
  expect(
    buildDistribution([at(100), at(200), at(300), overload, temp]).percentiles,
  ).toEqual({ 10: 120, 25: 150, 50: 200, 75: 250, 90: 280 })
  expect(buildDistribution([]).maxRateCents).toBeNull()
})

test('jobs filter by group, staff kind, and term', () => {
  const records = [
    unclassifiedJob(),
    unclassifiedJob({ termOfServiceMonths: 12 }),
    classifiedJob(),
    temp,
  ]
  const all = { group: null, kind: 'all', term: null } as const
  expect(filterJobs(records, all, 2025)).toHaveLength(4)
  expect(filterJobs(records, { ...all, term: 9 }, 2025)).toHaveLength(1)
  expect(
    filterJobs(records, { ...all, kind: 'classified' }, 2025),
  ).toHaveLength(2)
  expect(
    filterJobs(records, { ...all, group: 'Classified temporaries' }, 2025),
  ).toEqual([temp])
})

test('bins are labelled by their floor, and the top bin is open', () => {
  const [first, ...rest] = buildDistribution([]).bins
  const top = rest.at(-1)
  if (!first || !top) throw new Error('no bins')
  expect([binLabel(first), binRange(first)]).toEqual(['$0', '$0 to $9,999'])
  expect([binLabel(top), binRange(top)]).toEqual([
    '$250K+',
    '$250,000 and over',
  ])
  expect(rest[4] && binLabel(rest[4])).toBe('$50K')
})

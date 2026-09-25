import { expect, test } from 'vitest'
import type { FallRecord } from '@/data/fall'
import { census, classifiedJob, unclassifiedJob } from '@/test/fall-records'
import {
  ALL_PAIRS,
  changeBinLabel,
  changeCounts,
  continuingPairs,
  filterPairs,
  payChangeDistribution,
  payChangeTrends,
} from './pay-changes'
import type { TrendFilter } from './trends'

const ALL_JOBS: TrendFilter = {
  kind: 'all',
  group: null,
  dept: null,
  position: null,
  from: 2014,
  to: 2025,
}

/** Two censuses in which each name's primary job moves from its first record to its second. */
function linkedYears(fromYear: number, jobs: [FallRecord, FallRecord][]) {
  const named = jobs.map(([from, to], index) => {
    const name = `Person ${index}`
    return [
      { ...from, name },
      { ...to, name },
    ] as const
  })
  return [
    census(
      fromYear,
      named.map(([from]) => from),
    ),
    census(
      fromYear + 1,
      named.map(([, to]) => to),
    ),
  ]
}

function classifiedPair(fromCents: number, toCents: number) {
  return [
    classifiedJob({ annualSalaryRateCents: fromCents }),
    classifiedJob({ annualSalaryRateCents: toCents }),
  ] satisfies [FallRecord, FallRecord]
}

test('pairs leave out temporaries, staff kind moves, and term changes, and group by the earlier job', () => {
  const pairs = continuingPairs(
    linkedYears(2020, [
      classifiedPair(5_000_000, 5_350_000),
      [
        classifiedJob({ positionClass: { code: 'TS901', title: null } }),
        classifiedJob({ positionClass: { code: 'TS901', title: null } }),
      ],
      [unclassifiedJob(), unclassifiedJob({ termOfServiceMonths: 12 })],
      [classifiedJob(), unclassifiedJob({ termOfServiceMonths: 12 })],
      [
        unclassifiedJob({ annualSalaryRateCents: 6_000_000 }),
        unclassifiedJob({
          annualSalaryRateCents: 5_700_000,
          eeoCategory: 'Other Professionals',
        }),
      ],
    ]),
  )
  expect(
    pairs.map(({ from, group, ratio }) => [from.name, group, ratio]),
  ).toEqual([
    ['Person 0', 'Classified staff', 0.07],
    ['Person 4', 'Faculty', -0.05],
  ])
})

test('each line is the median of its pairs, blank below three', () => {
  const pairs = continuingPairs([
    ...linkedYears(2020, [
      classifiedPair(100_000, 100_000),
      classifiedPair(100_000, 102_000),
      classifiedPair(100_000, 104_000),
      classifiedPair(100_000, 110_000),
      [
        unclassifiedJob({ annualSalaryRateCents: 100_000 }),
        unclassifiedJob({ annualSalaryRateCents: 105_000 }),
      ],
    ]),
  ])
  const [all, faculty, classified] = payChangeTrends(pairs, [2020, 2021], null)
  expect(all?.key).toBe(ALL_PAIRS)
  expect(all?.points[0]?.median).toBeCloseTo(0.04, 10)
  expect(faculty).toMatchObject({
    key: 'Faculty',
    points: [{ pairs: 1, median: null }, { pairs: 0 }],
  })
  expect(classified?.key).toBe('Classified staff')
  const point = classified?.points[0]
  expect(point?.pairs).toBe(4)
  expect(point?.median).toBeCloseTo(0.03, 10)
})

test('changes fall in whole-point bins from -5% to 20%, with open bins either side', () => {
  const pairs = continuingPairs(
    linkedYears(2024, [
      classifiedPair(100, 90),
      classifiedPair(100, 95),
      classifiedPair(10_000, 10_699),
      classifiedPair(100, 107),
      classifiedPair(100, 114),
      classifiedPair(100, 120),
      classifiedPair(100, 129),
    ]),
  )
  const { bins, counts } = payChangeDistribution(pairs)
  expect(bins).toHaveLength(27)
  expect(bins.map(changeBinLabel).slice(0, 2)).toEqual(['<-5%', '-5%'])
  expect(bins.map(changeBinLabel).at(-1)).toBe('20%+')
  const filled = bins.flatMap((bin) =>
    bin.total > 0 ? [[changeBinLabel(bin), bin.total]] : [],
  )
  expect(filled).toEqual([
    ['<-5%', 1],
    ['-5%', 1],
    ['6%', 1],
    ['7%', 1],
    ['14%', 1],
    ['20%+', 2],
  ])
  expect(counts['Classified staff']).toBe(7)
})

test('class changes ignore the prefix, and rank and title changes leave out renames and unpublished ranks', () => {
  const office = (code: string, jobTitle: string) =>
    classifiedJob({ positionClass: { code, title: null }, jobTitle })
  const pairs = continuingPairs(
    linkedYears(2024, [
      [
        unclassifiedJob({ rank: 'Instructor', academicTitle: 'Instructor' }),
        unclassifiedJob({
          rank: 'Teaching Assistant Professor',
          academicTitle: 'Asst Teaching Professor',
        }),
      ],
      [
        unclassifiedJob({ rank: 'Assistant Professor' }),
        unclassifiedJob({ rank: 'Associate Professor' }),
      ],
      [
        unclassifiedJob({ rank: null }),
        unclassifiedJob({ rank: 'Research Assistant (Type B)' }),
      ],
      [
        office('E1464', 'Analyst Programmer'),
        office('C1464', 'Analyst Programmer'),
      ],
      [
        office('E0103', 'Office Specialist 1'),
        office('E0104', 'Office Specialist I'),
      ],
      [
        office('E0104', 'Admin Asst'),
        office('E0104', 'Administrative Assistant'),
      ],
    ]),
  )
  expect(changeCounts(pairs, [2024])).toEqual([
    {
      fromYear: 2024,
      pairs: 6,
      classified: 3,
      classChanged: 1,
      unclassified: 3,
      rankChanged: 1,
      rankUnpublished: 1,
      titleChanged: 1,
    },
  ])
})

test('filters narrow by the earlier job’s kind, pay department, and class or rank', () => {
  const pairs = continuingPairs(
    linkedYears(2024, [
      classifiedPair(100, 101),
      [
        unclassifiedJob({ rank: 'Professor' }),
        unclassifiedJob({
          rank: 'Professor',
          payDepartment: { code: '999999', name: 'Other' },
        }),
      ],
      [
        unclassifiedJob({
          rank: 'Professor',
          payDepartment: { code: '222222', name: 'Physics' },
        }),
        unclassifiedJob({
          rank: 'Professor',
          payDepartment: { code: '222222', name: 'Physics' },
        }),
      ],
    ]),
  )
  const names = (filter: Partial<TrendFilter>) =>
    filterPairs(pairs, { ...ALL_JOBS, ...filter }).map(({ from }) => from.name)
  expect(names({})).toEqual(['Person 0', 'Person 2'])
  expect(names({ kind: 'classified' })).toEqual(['Person 0'])
  expect(names({ dept: '222222', position: 'rank Professor' })).toEqual([
    'Person 2',
  ])
  expect(names({ position: 'class 0104' })).toEqual(['Person 0'])
  expect(names({ group: 'Classified staff' })).toEqual(['Person 0'])
  expect(names({ from: 2025 })).toEqual([])
  expect(names({ to: 2024 })).toEqual([])
})

test('an opened group’s lines are its earlier jobs’ published categories', () => {
  const pairs = continuingPairs(
    linkedYears(2020, [
      ...[100_000, 102_000, 104_000].map(
        (toCents): [FallRecord, FallRecord] => [
          unclassifiedJob({
            eeoCategory: 'Other Professionals',
            annualSalaryRateCents: 100_000,
          }),
          unclassifiedJob({
            eeoCategory: 'Senior Administrators',
            annualSalaryRateCents: toCents,
          }),
        ],
      ),
      [
        unclassifiedJob({ eeoCategory: 'Senior Administrators' }),
        unclassifiedJob({ eeoCategory: 'Senior Administrators' }),
      ],
    ]),
  )
  const opened = payChangeTrends(
    filterPairs(pairs, { ...ALL_JOBS, group: 'Admins and professionals' }),
    [2020],
    'Admins and professionals',
  )
  expect(
    opened.map(({ key, points }) => [key, points[0]?.pairs, points[0]?.median]),
  ).toEqual([
    [ALL_PAIRS, 4, 0.01],
    ['Other Professionals', 3, 0.02],
    ['Senior Administrators', 1, null],
  ])
})

import { expect, test } from 'vitest'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { buildTrends, medianRateCents, type TrendFilter } from './trends'

const ALL: TrendFilter = { kind: 'all', group: null, from: 2014, to: 2025 }
const temp = classifiedJob({
  name: 'Temp, Tia',
  apptPercent: 10,
  annualSalaryRateCents: 41_600_000,
  positionClass: { code: 'TS4017', title: null },
})

test('the median of an even count is the mean of the middle two, rounded to the cent', () => {
  expect(medianRateCents([3, 1, 2])).toBe(2)
  expect(medianRateCents([4, 1, 2, 7])).toBe(3)
  expect(medianRateCents([1, 4])).toBe(3)
  expect(medianRateCents([])).toBeNull()
})

test('each group gets a point per census; temps count in FTE only', () => {
  const trends = buildTrends(
    [
      {
        year: 2025,
        records: [
          unclassifiedJob({ annualSalaryRateCents: 9_000_000 }),
          unclassifiedJob({
            jobType: 'Overload',
            apptPercent: 10,
            annualSalaryRateCents: 1_000_000,
          }),
          classifiedJob(),
          temp,
        ],
      },
      { year: 2024, records: [unclassifiedJob({ apptPercent: 50 })] },
    ],
    ALL,
  )
  expect(trends.series.map((line) => line.key)).toEqual([
    'Faculty',
    'Classified staff',
    'Overloads',
    'Classified temporaries',
  ])
  expect(trends.series[0]?.points).toEqual([
    {
      year: 2024,
      spendCents: 2_500_000,
      fteHundredths: 50,
      medianRateCents: 5_000_000,
    },
    {
      year: 2025,
      spendCents: 9_000_000,
      fteHundredths: 100,
      medianRateCents: 9_000_000,
    },
  ])
  expect(trends.series[2]?.points[0]).toMatchObject({
    year: 2024,
    fteHundredths: null,
  })
  expect(trends.series[2]?.points[1]?.medianRateCents).toBeNull()
  expect(trends.series[3]?.points[1]).toEqual({
    year: 2025,
    spendCents: null,
    fteHundredths: 10,
    medianRateCents: null,
  })
  expect(trends.total[1]).toEqual({
    year: 2025,
    spendCents: 9_000_000 + 100_000 + 5_000_000,
    fteHundredths: 100 + 10 + 100 + 10,
    medianRateCents: 7_000_000,
  })
})

test('an opened group lines up its published categories; kind and range filter first', () => {
  const years = [
    {
      year: 2018,
      records: [
        unclassifiedJob({ eeoCategory: 'Senior Administrators' }),
        unclassifiedJob({ eeoCategory: 'Other Professionals' }),
        unclassifiedJob({ eeoCategory: 'Faculty' }),
      ],
    },
    {
      year: 2017,
      records: [unclassifiedJob({ eeoCategory: 'Other Professionals' })],
    },
  ]
  const opened = buildTrends(years, {
    ...ALL,
    group: 'Admins and professionals',
  })
  expect(opened.series.map((line) => line.key)).toEqual([
    'Other Professionals',
    'Senior Administrators',
  ])
  expect(opened.series[1]?.points.map((point) => point.fteHundredths)).toEqual([
    null,
    100,
  ])
  expect(opened.total.map((point) => point.fteHundredths)).toEqual([100, 200])
  expect(buildTrends(years, { ...ALL, from: 2018 }).total).toHaveLength(1)
  expect(buildTrends(years, { ...ALL, kind: 'classified' }).series).toEqual([])
})

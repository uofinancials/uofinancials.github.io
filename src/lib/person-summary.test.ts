import { expect, test } from 'vitest'
import { census, classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { formatChange, formatYears } from './format'
import { indexPeople } from './person-lookup'
import {
  jobHistory,
  personRates,
  resolvePersonYear,
  runCards,
  runOf,
  TOTAL_SERIES,
} from './person-summary'

const physics = { code: '222222', name: 'Physics' }

function ann() {
  const [person] = indexPeople([
    census(2020, [
      classifiedJob({
        annualSalaryRateCents: 5_000_000,
        jobStartDate: '2018-11-01',
      }),
    ]),
    census(2021, [classifiedJob({ annualSalaryRateCents: 5_500_000 })]),
    census(2022, [
      classifiedJob({ annualSalaryRateCents: 6_600_000, apptPercent: 50 }),
    ]),
    census(2023, [
      classifiedJob({ annualSalaryRateCents: 6_600_000, apptPercent: 50 }),
      unclassifiedJob({
        jobType: 'Overload',
        payDepartment: physics,
        annualSalaryRateCents: 1_000_000,
        apptPercent: 10,
      }),
    ]),
    census(2025, [classifiedJob({ annualSalaryRateCents: 7_000_000 })]),
  ])
  if (!person) throw new Error('no person indexed')
  return person
}

test('a linked run’s cards: time since the earliest start, the run’s change, and the mean over comparable pairs', () => {
  const run = runOf(ann(), 2021)
  expect(run?.years.map(({ year }) => year)).toEqual([2020, 2021, 2022, 2023])
  const cards = run && runCards(run)
  expect(cards?.yearsSinceStart).toBeCloseTo(5, 2)
  expect(cards?.runChange).toMatchObject({
    fromYear: 2020,
    toYear: 2023,
    fromCents: 5_000_000,
    toCents: 6_600_000,
    ratio: 0.32,
  })
  expect(cards?.averageChange?.pairsUsed).toBe(2)
  expect(cards?.averageChange?.pairs).toBe(3)
  expect(cards?.averageChange?.ratio).toBeCloseTo((0.1 + 0) / 2, 10)
})

test('an unlinked year has only the start-date card', () => {
  const run = runOf(ann(), 2025)
  const cards = run && runCards(run)
  expect(cards?.runChange).toBeNull()
  expect(cards?.averageChange).toBeNull()
  expect(cards?.yearsSinceStart).toBeCloseTo(5.8, 1)
})

test('a year the name lacks falls back to its latest census', () => {
  expect(resolvePersonYear(ann(), 2024)).toBe(2025)
  expect(resolvePersonYear(ann(), 2021)).toBe(2021)
  expect(resolvePersonYear(ann(), undefined)).toBe(2025)
})

test('each job is a line of published rates, gapped where absent, with the total of rate × appointment', () => {
  const { years, series } = personRates(ann())
  expect(years).toEqual([2020, 2021, 2022, 2023, 2025])
  expect(series).toEqual([
    {
      key: 'Office Specialist 2 · Dept · Primary',
      values: [5_000_000, 5_500_000, 6_600_000, 6_600_000, 7_000_000],
    },
    {
      key: 'Instructor · Physics · Overload',
      values: [null, null, null, 1_000_000, null],
    },
    {
      key: TOTAL_SERIES,
      values: [5_000_000, 5_500_000, 3_300_000, 3_400_000, 7_000_000],
    },
  ])
})

test('two same-titled jobs in one year stay separate lines', () => {
  const [person] = indexPeople([
    census(2025, [
      classifiedJob({ jobType: 'Secondary', annualSalaryRateCents: 100 }),
      classifiedJob({ jobType: 'Secondary', annualSalaryRateCents: 200 }),
    ]),
  ])
  expect(person && personRates(person).series.map(({ key }) => key)).toEqual([
    'Office Specialist 2 · Dept · Secondary',
    'Office Specialist 2 · Dept · Secondary (2)',
    TOTAL_SERIES,
  ])
})

test('the job history lists every job as published, with its run’s link', () => {
  const rows = jobHistory(ann())
  expect(rows).toHaveLength(6)
  expect(rows[4]).toMatchObject({
    year: 2023,
    isLinked: true,
    title: 'Instructor',
    classOrRank: 'Instructor',
    payDepartment: 'Physics',
    jobType: 'Overload',
    apptPercent: 10,
    termOfServiceMonths: 9,
  })
  expect(rows[5]).toMatchObject({ year: 2025, isLinked: false })
})

test('changes and years format with a sign and one decimal', () => {
  expect(formatChange(0.141)).toBe('+14.1%')
  expect(formatChange(-0.05)).toBe('-5.0%')
  expect(formatChange(0)).toBe('0.0%')
  expect(formatYears(9.24)).toBe('9.2 years')
})

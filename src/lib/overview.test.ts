import { expect, test } from 'vitest'
import { classifiedJob } from '@/test/fall-records'
import {
  categoryTotals,
  fiscalYearOf,
  groupTotals,
  jobSpendCents,
  selectOverviewSources,
  summarize,
} from './overview'

const job = classifiedJob

test('job spend is rate x FTE, rounded to the cent, and zero when unpaid', () => {
  expect(
    jobSpendCents(job({ annualSalaryRateCents: 4_363_801, apptPercent: 75 })),
  ).toBe(3_272_851)
  expect(jobSpendCents(job({ jobStatus: 'On Leave Without Pay' }))).toBe(0)
  expect(jobSpendCents(job({ jobStatus: 'On Leave No Pay No Ben' }))).toBe(0)
  expect(jobSpendCents(job({ jobStatus: 'On Leave With Pay' }))).toBe(5_000_000)
})

test('a person with two jobs is one person, two jobs, and their summed FTE', () => {
  expect(
    summarize([
      job({ apptPercent: 75 }),
      job({
        jobType: 'Secondary',
        apptPercent: 25,
        annualSalaryRateCents: 2_000_000,
      }),
      job({ name: 'Roe, Bo', apptPercent: 50 }),
    ]),
  ).toEqual({
    people: 2,
    jobs: 3,
    fteHundredths: 150,
    spendCents: 3_750_000 + 500_000 + 2_500_000,
  })
})

test('groups are sorted by spend, and a person counts once in each group', () => {
  const groups = groupTotals(
    [
      job({ eeoCategory: 'Faculty', annualSalaryRateCents: 9_000_000 }),
      job({
        eeoCategory: 'Secy/Clerical',
        jobType: 'Secondary',
        apptPercent: 20,
      }),
      job({ name: 'Roe, Bo', eeoCategory: 'Secy/Clerical' }),
    ],
    (record) => record.eeoCategory ?? '',
  )
  expect(groups.map((group) => [group.key, group.totals.people])).toEqual([
    ['Faculty', 1],
    ['Secy/Clerical', 2],
  ])
  expect(groups[1]?.totals.spendCents).toBe(1_000_000 + 5_000_000)
})

test('category totals keep classified temporaries out of spend and in a row of their own', () => {
  const totals = categoryTotals([
    job({ apptPercent: 100 }),
    job({
      name: 'Temp, Tia',
      apptPercent: 10,
      annualSalaryRateCents: 41_600_000,
      eeoCategory: 'Other/Temp',
      positionClass: { code: 'TS4017', title: null },
    }),
  ])
  expect(totals).toEqual({
    byCategory: [
      {
        key: 'Secy/Clerical',
        totals: {
          people: 1,
          jobs: 1,
          fteHundredths: 100,
          spendCents: 5_000_000,
        },
      },
    ],
    temps: { people: 1, jobs: 1, fteHundredths: 10, spendCents: 4_160_000 },
    totalSpendCents: 5_000_000,
  })
})

test('a census date falls in the fiscal year ending the next June', () => {
  expect(fiscalYearOf('2025-11-01')).toBe(2026)
  expect(fiscalYearOf('2014-10-31')).toBe(2015)
  expect(fiscalYearOf('2026-06-30')).toBe(2026)
})

test('the overview uses the latest census and the budget of its fiscal year, or the latest before it', () => {
  const census = (year: number) => ({
    year,
    censusDate: `${year}-11-01`,
    sourcePage: 'https://example.org',
    files: [],
  })
  const budget = (fiscalYear: number) => ({
    fiscalYear,
    period: '14',
    sourcePage: 'https://example.org',
    fileName: 'f.xlsx',
    url: 'https://example.org/f.xlsx',
    sha256: 'a'.repeat(64),
    lastModified: null,
    retrievedOn: '2026-09-24',
    rows: 0,
    totalExpenditureBudgetCents: 0,
  })
  const selected = (fall: number[], budgets: number[]) => {
    const { census: entry, fiscalYear } = selectOverviewSources({
      fall: fall.map(census),
      budget: budgets.map(budget),
      rates: null,
    })
    return [entry.year, fiscalYear]
  }
  expect(selected([2024, 2025, 2014], [2026, 2027, 2025])).toEqual([2025, 2026])
  expect(selected([2025, 2026], [2026])).toEqual([2026, 2026])
  expect(() => selected([], [2026])).toThrow(
    'The manifest lists no Fall census',
  )
  expect(selected([2020], [2027, 2026])).toEqual([2020, 2026])
  expect(() => selected([2020], [])).toThrow(
    'The manifest lists no budget for the census of 2020-11-01',
  )
})

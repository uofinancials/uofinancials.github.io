import { expect, test } from 'vitest'
import type { FallClassified, FallRecord } from '@/data/fall'
import {
  buildOverview,
  fiscalYearOf,
  groupTotals,
  jobSpendCents,
  summarize,
} from './overview'

function job(overrides: Partial<FallClassified>): FallRecord {
  return {
    kind: 'classified',
    name: 'Doe, Ann',
    jobType: 'Primary',
    jobStatus: 'Active',
    jobStartDate: '2020-01-01',
    jobEndDate: null,
    homeDepartment: { code: null, name: 'Home' },
    payDepartment: { code: '111111', name: 'Dept' },
    annualSalaryRateCents: 5_000_000,
    apptPercent: 100,
    termOfServiceMonths: 12,
    eeoCategory: 'Secy/Clerical',
    sourcePage: 1,
    possibleStudent: false,
    jobTitle: 'Office Specialist 2',
    positionClass: { code: 'E0104', title: 'Office Specialist 2' },
    ...overrides,
  }
}

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

test('the overview keeps classified temporaries out of spend but in headcount and FTE', () => {
  const overview = buildOverview(
    [
      job({ apptPercent: 100 }),
      job({
        name: 'Temp, Tia',
        apptPercent: 10,
        annualSalaryRateCents: 41_600_000,
        eeoCategory: 'Other/Temp',
        positionClass: { code: 'TS4017', title: null },
      }),
    ],
    () => 'Area A',
  )
  expect(overview.total).toEqual({
    people: 2,
    jobs: 2,
    fteHundredths: 110,
    spendCents: 5_000_000,
  })
  expect(overview.byCategory.map((group) => group.key)).toEqual([
    'Secy/Clerical',
  ])
  expect(overview.byArea).toEqual([
    {
      key: 'Area A',
      totals: { people: 1, jobs: 1, fteHundredths: 100, spendCents: 5_000_000 },
    },
  ])
  expect(overview.temps).toEqual({
    people: 1,
    jobs: 1,
    fteHundredths: 10,
    spendCents: 4_160_000,
  })
})

test('a census date falls in the fiscal year ending the next June', () => {
  expect(fiscalYearOf('2025-11-01')).toBe(2026)
  expect(fiscalYearOf('2014-10-31')).toBe(2015)
  expect(fiscalYearOf('2026-06-30')).toBe(2026)
})

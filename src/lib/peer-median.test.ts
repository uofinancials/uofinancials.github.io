import { expect, test } from 'vitest'
import { census, classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { peerGroupOf } from './peer-group'
import { peerMedianFor, peerMedians } from './peer-median'

const analyst = (code: string, annualSalaryRateCents: number) =>
  classifiedJob({
    positionClass: { code, title: 'Analyst Programmer' },
    annualSalaryRateCents,
  })

test('classified jobs group by class number whatever the prefix, ranks by rank, and no rank by OA grade', () => {
  expect(peerGroupOf(analyst('C1464', 1))).toEqual({
    key: 'class 1464',
    label: 'Analyst Programmer (class 1464)',
  })
  expect(peerGroupOf(analyst('E1464', 1))?.key).toBe('class 1464')
  expect(
    peerGroupOf(
      classifiedJob({ positionClass: { code: 'TS401', title: null } }),
    ),
  ).toBeNull()
  expect(peerGroupOf(classifiedJob({ positionClass: null }))).toBeNull()
  expect(peerGroupOf(unclassifiedJob())?.label).toBe('Instructor')
  expect(
    peerGroupOf(unclassifiedJob({ rank: 'No Rank', oaSalaryGrade: 'OA07' })),
  ).toEqual({ key: 'grade OA07', label: 'OA salary grade OA07' })
  expect(
    peerGroupOf(unclassifiedJob({ rank: 'No Rank', oaSalaryGrade: 'n/a' })),
  ).toBeNull()
  expect(peerGroupOf(unclassifiedJob({ rank: null }))).toBeNull()
})

test('a median counts primary jobs of the same group and term, and needs three', () => {
  const medians = peerMedians([
    census(2025, [
      analyst('C1464', 9_000_000),
      analyst('E1464', 10_000_000),
      analyst('D1464', 12_000_000),
      analyst('C1464', 11_000_000),
      classifiedJob({
        positionClass: { code: 'C1464', title: 'Analyst Programmer' },
        jobType: 'Secondary',
        annualSalaryRateCents: 1,
      }),
      classifiedJob({
        positionClass: { code: 'C1464', title: 'Analyst Programmer' },
        termOfServiceMonths: 9,
      }),
      unclassifiedJob(),
      unclassifiedJob(),
    ]),
  ])
  const person = analyst('E1464', 10_000_000)
  expect(peerMedianFor(medians, 2025, person)).toMatchObject({
    medianCents: 10_500_000,
    jobs: 4,
  })
  expect(
    peerMedianFor(medians, 2025, { ...person, termOfServiceMonths: 9 }),
  ).toBeNull()
  expect(peerMedianFor(medians, 2025, unclassifiedJob())).toBeNull()
  expect(peerMedianFor(medians, 2024, person)).toBeNull()
})

import { expect, test } from 'vitest'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { ANY_SCOPE, scenarioBudget, UNIT } from '@/test/scenario-fixtures'
import { toDepartmentCensus } from './department-jobs'
import {
  describeRule,
  describeScope,
  positionOptions,
  smallReachNote,
} from './scenario-labels'

const BUDGET = scenarioBudget([])
const CENSUS = toDepartmentCensus(
  {
    year: 2025,
    records: [classifiedJob({ payDepartment: { code: UNIT, name: 'Bio' } })],
  },
  BUDGET,
)

test('a scope reads as its chosen fields, or as all jobs', () => {
  expect(describeScope(ANY_SCOPE, CENSUS, BUDGET)).toBe('All jobs')
  expect(
    describeScope(
      {
        group: 'Classified staff',
        kind: 'classified',
        term: 12,
        position: 'E0104',
        dept: UNIT,
      },
      CENSUS,
      BUDGET,
    ),
  ).toBe(
    'Classified staff, classified, 12-month, Office Specialist 2 (E0104), in CAS Biology (223100)',
  )
  expect(describeScope({ ...ANY_SCOPE, dept: '999999' }, CENSUS, BUDGET)).toBe(
    'in code 999999, which has no jobs in Fall 2025',
  )
})

test('a rule reads as what it does', () => {
  expect(
    describeRule({
      kind: 'threshold',
      scope: ANY_SCOPE,
      overCents: 20_000_000,
      cutBasisPoints: 1_250,
    }),
  ).toBe('12.5% off pay above $200,000')
  expect(
    describeRule({
      kind: 'threshold',
      scope: ANY_SCOPE,
      overCents: 25_000_000,
      cutBasisPoints: 10_000,
    }),
  ).toBe('Pay capped at $250,000')
  expect(describeRule({ kind: 'remove', scope: ANY_SCOPE })).toBe(
    'Jobs removed',
  )
  expect(
    describeRule({ kind: 'cut', scope: ANY_SCOPE, cutBasisPoints: 200 }),
  ).toBe('2% off pay')
  expect(
    describeRule({
      kind: 'freeze',
      scope: ANY_SCOPE,
      years: 2,
      afterFreeze: 'eliminate',
    }),
  ).toBe('A 2-year hiring freeze, then positions eliminated')
})

test('only a rule reaching one or two jobs carries the small-reach note', () => {
  expect(smallReachNote(0)).toBeNull()
  expect(smallReachNote(1)).toMatch(/^This rule reaches one job\./)
  expect(smallReachNote(2)).toMatch(/^This rule reaches two jobs\./)
  expect(smallReachNote(3)).toBeNull()
})

test('position options list each class and rank once, by label', () => {
  expect(
    positionOptions([
      classifiedJob(),
      classifiedJob(),
      classifiedJob({ positionClass: { code: 'C1487', title: null } }),
      unclassifiedJob({ rank: 'Professor' }),
      unclassifiedJob({ rank: null }),
    ]),
  ).toEqual([
    ['C1487', 'C1487'],
    ['E0104', 'Office Specialist 2 (E0104)'],
    ['Professor', 'Professor'],
  ])
})

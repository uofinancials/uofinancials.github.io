import { expect, test } from 'vitest'
import type { BudgetYear } from '@/data/budget'
import { payChangesFileSchema } from '@/data/pay-changes'
import { areaPlacer, toDepartmentCensus } from '@/lib/departments/jobs'
import { census, classifiedJob, unclassifiedJob } from '@/test/fall-records'
import { decodePairs, encodePairs, pairNames } from './pair-file'
import { type ContinuingPair, continuingPairs } from './pay-changes'

const BUDGET: BudgetYear = {
  fiscalYear: 2026,
  period: '12',
  orgs: {
    '222000': { name: 'Arts & Sciences, College of', level: 3, parent: null },
    '223100': { name: 'CAS Biology', level: 5, parent: '222000' },
  },
  funds: {},
  fundTypes: {},
  accountTypes: {},
  rows: [],
}

const BIOLOGY = { code: '223100', name: 'CAS Biology' }
const JOINED = { code: '226535', name: 'Old Name', publishedCode: '226530' }

const FALL_2024 = [
  unclassifiedJob({ name: 'Lee, Ann', payDepartment: BIOLOGY }),
  unclassifiedJob({ name: 'Ray, Bo', rank: null, eeoCategory: null }),
  classifiedJob({ name: 'Cho, Di', payDepartment: JOINED }),
]
const FALL_2025 = [
  unclassifiedJob({
    name: 'Lee, Ann',
    payDepartment: { ...BIOLOGY, name: 'Biology' },
    rank: 'Professor',
    annualSalaryRateCents: 5_300_000,
  }),
  unclassifiedJob({ name: 'Ray, Bo', rank: null, eeoCategory: null }),
  classifiedJob({
    name: 'Cho, Di',
    payDepartment: JOINED,
    positionClass: { code: 'E0104', title: 'Office Specialist II' },
    annualSalaryRateCents: 5_100_000,
  }),
]

const CENSUSES = [
  toDepartmentCensus({ year: 2025, records: FALL_2025 }, BUDGET),
  toDepartmentCensus({ year: 2024, records: FALL_2024 }, BUDGET),
]
const NAMES = pairNames(CENSUSES, [BUDGET])
const PAIRS = continuingPairs(
  [census(2024, FALL_2024), census(2025, FALL_2025)],
  areaPlacer(CENSUSES),
)

const byText = (pairs: ContinuingPair[]) =>
  pairs.map((pair) => JSON.stringify(pair)).sort()

test('names read as the earliest census has them: a department by a record under its own code or else its code, a class or rank by its label, an area by its budget', () => {
  expect(NAMES).toEqual({
    depts: [
      { code: '111111', name: 'Dept (111111)' },
      { code: '223100', name: 'CAS Biology (223100)' },
      { code: '226535', name: '226535' },
    ],
    areas: [{ code: '222000', name: 'Arts & Sciences, College of' }],
    peers: [
      { key: 'class 0104', label: 'Office Specialist 2 (class 0104)' },
      { key: 'rank Instructor', label: 'Instructor' },
      { key: 'rank Professor', label: 'Professor' },
    ],
  })
})

test('the file gives back every pair, holds no name, and does not follow the order the pairs came in', () => {
  const file = encodePairs(PAIRS, NAMES)
  expect(payChangesFileSchema.parse(file)).toEqual(file)
  expect(PAIRS).toHaveLength(3)
  expect(byText(decodePairs(file))).toEqual(byText(PAIRS))
  expect(JSON.stringify(file)).not.toMatch(/Lee|Ray|Cho/)
  expect(encodePairs([...PAIRS].reverse(), NAMES)).toEqual(file)
  expect(file.pairs.area).toEqual([null, null, 0])
  expect(file.pairs.fromCents).toEqual([5_000_000, 5_000_000, 5_000_000])
  expect(file.pairs.toCents).toEqual([5_100_000, 5_000_000, 5_300_000])
})

test('a pair whose department, area, or class or rank is not listed is not written', () => {
  expect(() => encodePairs(PAIRS, { ...NAMES, depts: [] })).toThrow(
    'no pay department "223100"',
  )
  expect(() => encodePairs(PAIRS, { ...NAMES, areas: [] })).toThrow(
    'no area "222000"',
  )
  expect(() => encodePairs(PAIRS, { ...NAMES, peers: [] })).toThrow(
    'no class or rank',
  )
})

test('a file naming a group or raise row the site does not know is not read', () => {
  const file = encodePairs(PAIRS, NAMES)
  expect(() => decodePairs({ ...file, groups: ['Deans'] })).toThrow(
    'no group "Deans"',
  )
  expect(() =>
    decodePairs({ ...file, raises: file.raises.map(() => 'Guild') }),
  ).toThrow('no raise row "Guild"')
})

test('a file whose columns differ in length, or whose index is past its list, does not parse', () => {
  const file = encodePairs(PAIRS, NAMES)
  const issues = (columns: Partial<typeof file.pairs>) =>
    payChangesFileSchema
      .safeParse({ ...file, pairs: { ...file.pairs, ...columns } })
      .error?.issues.map(({ message }) => message)
  expect(issues({})).toBeUndefined()
  expect(issues({ toCents: [5_100_000] })).toEqual([
    'Column toCents has 1 pairs, not 3',
  ])
  expect(issues({ dept: [0, 1, 3] })).toEqual([
    'Column dept points past its list of 3',
  ])
})

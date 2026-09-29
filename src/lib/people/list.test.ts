import { expect, test } from 'vitest'
import { buildDistribution } from '@/lib/census/salary-distribution'
import { classifiedJob, unclassifiedJob } from '@/test/fall-records'
import {
  activeFilters,
  binRangeSearch,
  binsInRange,
  type CensusNames,
  countNames,
  distinctValues,
  filterPeopleJobs,
  groupSummary,
  PAGE_SIZE,
  pageOf,
  resolvePeopleView,
  sortJobs,
} from './list'

const YEARS = [2024, 2025]
const view = (search: Parameters<typeof resolvePeopleView>[0] = {}) =>
  resolvePeopleView(search, YEARS)
const names = (records: { name: string }[]) => records.map(({ name }) => name)

const ann = classifiedJob({
  name: 'Smith, Ann',
  annualSalaryRateCents: 5_000_000,
})
const bo = classifiedJob({
  name: 'Jones, Bo',
  jobTitle: 'Accountant 1',
  eeoCategory: 'Other Professionals',
  annualSalaryRateCents: 5_999_950,
})
const cy = unclassifiedJob({
  name: 'Smith, Cy',
  academicTitle: 'Senior Instructor 1',
  annualSalaryRateCents: 6_000_000,
})

test('the view defaults to the latest census, name order, page 1, and the rates chart', () => {
  expect(view()).toMatchObject({
    year: 2025,
    q: '',
    category: null,
    minCents: null,
    ceilingCents: null,
    sort: 'name',
    dir: 'asc',
    page: 1,
    chart: 'rates',
    columns: ['title', 'dept', 'rate', 'appt'],
  })
  expect(view({ cols: ['category'] }).columns).toEqual(['category'])
})

test('the rate range is in whole dollars, both ends inclusive', () => {
  const range = view({ min: 50_000, max: 59_999 })
  expect([range.minCents, range.ceilingCents]).toEqual([5_000_000, 6_000_000])
  expect(names(filterPeopleJobs([ann, bo, cy], range))).toEqual([
    'Smith, Ann',
    'Jones, Bo',
  ])
  expect(names(filterPeopleJobs([ann, bo, cy], view({ min: 59_999 })))).toEqual(
    ['Jones, Bo', 'Smith, Cy'],
  )
})

test('name and title match every word typed, and category matches as published', () => {
  const jobs = [ann, bo, cy]
  expect(names(filterPeopleJobs(jobs, view({ q: 'SMITH, a' })))).toEqual([
    'Smith, Ann',
  ])
  expect(
    names(filterPeopleJobs(jobs, view({ title: 'instructor sen' }))),
  ).toEqual(['Smith, Cy'])
  expect(
    names(filterPeopleJobs(jobs, view({ category: 'Other Professionals' }))),
  ).toEqual(['Jones, Bo'])
  expect(
    names(filterPeopleJobs(jobs, view({ kind: 'unclassified', q: 'smith' }))),
  ).toEqual(['Smith, Cy'])
})

test('jobs sort by the chosen column either way, ties by name then as published', () => {
  const second = classifiedJob({
    name: 'Smith, Ann',
    jobType: 'Secondary',
    annualSalaryRateCents: 5_000_000,
  })
  const jobs = [cy, second, ann, bo]
  expect(sortJobs(jobs, { ...view(), sort: 'name' })).toEqual([
    bo,
    second,
    ann,
    cy,
  ])
  expect(sortJobs(jobs, { ...view(), sort: 'rate', dir: 'desc' })).toEqual([
    cy,
    bo,
    second,
    ann,
  ])
  expect(names(sortJobs(jobs, { ...view(), sort: 'group' }))).toEqual([
    'Smith, Cy',
    'Jones, Bo',
    'Smith, Ann',
    'Smith, Ann',
  ])
})

test('pages hold 50 rows and clamp to the pages there are', () => {
  const rows = Array.from({ length: 2 * PAGE_SIZE + 1 }, (_, index) => index)
  expect(pageOf(rows, 3)).toEqual({ rows: [100], page: 3, pageCount: 3 })
  expect(pageOf(rows, 9).page).toBe(3)
  expect(pageOf(rows, 1).rows).toHaveLength(PAGE_SIZE)
  expect(pageOf([], 2)).toEqual({ rows: [], page: 1, pageCount: 1 })
})

test('names are counted once, and distinct values are sorted without blanks', () => {
  expect(countNames([ann, ann, bo])).toBe(2)
  expect(
    distinctValues(
      [cy, bo, ann, classifiedJob({ eeoCategory: null })],
      (record) => record.eeoCategory,
    ),
  ).toEqual(['Faculty', 'Other Professionals', 'Secy/Clerical'])
})

test('each group with a job gives its count, and its median from three primary jobs', () => {
  const faculty = [100, 200, 300].map((annualSalaryRateCents) =>
    unclassifiedJob({ annualSalaryRateCents }),
  )
  expect(groupSummary([...faculty, ann, bo], 2025)).toEqual([
    { group: 'Faculty', jobs: 3, medianRateCents: 200 },
    { group: 'Classified staff', jobs: 2, medianRateCents: null },
  ])
})

test('the chart keeps the bins that overlap the rate range, less empty ones at either end', () => {
  const jobs = [ann, classifiedJob({ annualSalaryRateCents: 7_500_000 })]
  const floors = (search: Parameters<typeof resolvePeopleView>[0]) =>
    binsInRange(buildDistribution(jobs, 2025), view(search)).bins.map(
      ({ floorCents }) => floorCents / 100_000,
    )
  expect(floors({})).toEqual([50, 60, 70])
  expect(floors({ min: 45_000, max: 60_000 })).toEqual([50])
  expect(floors({ min: 250_000 })).toEqual([])
})

test('a bin’s range is its floor to its last whole dollar, and the top bin has no maximum', () => {
  const [first, ...rest] = buildDistribution([], 2025).bins
  const top = rest.at(-1)
  if (!first || !top) throw new Error('no bins')
  expect(binRangeSearch(first)).toEqual({ min: 0, max: 9_999 })
  expect(binRangeSearch(top)).toEqual({ min: 250_000, max: undefined })
  expect(view(binRangeSearch(first)).ceilingCents).toBe(first.ceilingCents)
})

const NO_NAMES = { place: { scope: 'all' }, positionName: null } as const

test('each active filter reads as a chip with the search that clears it, in the order of the controls', () => {
  expect(
    activeFilters(view({ q: 'smith', min: 50_000, max: 59_999 }), NO_NAMES),
  ).toStrictEqual([
    { text: 'Name: smith', clear: { q: undefined } },
    { text: 'Rate from $50,000', clear: { min: undefined } },
    { text: 'Rate to $59,999', clear: { max: undefined } },
  ])
  expect(
    activeFilters(
      view({ group: 'Faculty', kind: 'classified', term: 9, year: 2025 }),
      {
        place: { scope: 'department', code: '223100', name: 'CAS Biology' },
        positionName: 'Professor',
      },
    ),
  ).toStrictEqual([
    { text: 'Group: Faculty', clear: { group: undefined } },
    { text: 'Staff: Classified', clear: { kind: undefined } },
    { text: 'Term: 9 months', clear: { term: undefined } },
    { text: 'Department: CAS Biology (223100)', clear: { dept: undefined } },
    { text: 'Class or rank: Professor', clear: { position: undefined } },
  ])
})

test('an area, and a code no census lists, each read as one chip', () => {
  const chipsOf = (place: CensusNames['place']) =>
    activeFilters(view(), { place, positionName: null })
  expect(chipsOf({ scope: 'area', code: '220000', name: 'CAS' })).toStrictEqual(
    [{ text: 'College or VP area: CAS', clear: { dept: undefined } }],
  )
  expect(chipsOf({ scope: 'unknown', code: '999999' })).toStrictEqual([
    { text: 'Code: 999999', clear: { dept: undefined } },
  ])
  expect(activeFilters(view({ year: 2025 }), NO_NAMES)).toStrictEqual([])
})

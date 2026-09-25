import type { FallRecord } from '../data/fall.ts'
import type {
  PeopleChart,
  PeopleSearch,
  PeopleSort,
  SortDirection,
} from './people-search.ts'
import { titleOf } from './person-fields.ts'
import { hasEveryWord, queryWords } from './person-lookup.ts'
import { resolveSalariesView, type SalariesView } from './salaries-search.ts'
import {
  type Distribution,
  filterJobs,
  positionOf,
} from './salary-distribution.ts'
import { TREND_GROUPS, type TrendGroup, trendGroupOf } from './trend-groups.ts'
import { measureJobs } from './trends.ts'

export const PAGE_SIZE = 50
const CENTS_PER_DOLLAR = 100

export type PeopleView = SalariesView & {
  q: string
  title: string
  category: string | null
  /** Inclusive. */
  minCents: number | null
  /** Exclusive: a whole-dollar maximum includes its cents. */
  ceilingCents: number | null
  sort: PeopleSort
  dir: SortDirection
  page: number
  chart: PeopleChart
}

/** The view a search asks for; a census not listed falls back to the latest. */
export function resolvePeopleView(
  search: PeopleSearch,
  years: number[],
): PeopleView {
  return {
    ...resolveSalariesView(search, years),
    q: search.q ?? '',
    title: search.title ?? '',
    category: search.category ?? null,
    minCents: search.min === undefined ? null : search.min * CENTS_PER_DOLLAR,
    ceilingCents:
      search.max === undefined ? null : (search.max + 1) * CENTS_PER_DOLLAR,
    sort: search.sort ?? 'name',
    dir: search.dir ?? 'asc',
    page: search.page ?? 1,
    chart: search.chart ?? 'rates',
  }
}

/** The jobs matching every filter of the view; the name and title match when they hold every word typed. */
export function filterPeopleJobs(
  records: FallRecord[],
  view: PeopleView,
): FallRecord[] {
  const nameWords = queryWords(view.q)
  const titleWords = queryWords(view.title)
  const { category, minCents, ceilingCents } = view
  return filterJobs(records, view, view.year).filter(
    (record) =>
      (category === null || record.eeoCategory === category) &&
      (minCents === null || record.annualSalaryRateCents >= minCents) &&
      (ceilingCents === null || record.annualSalaryRateCents < ceilingCents) &&
      hasEveryWord(record.name, nameWords) &&
      hasEveryWord(titleOf(record), titleWords),
  )
}

const collator = new Intl.Collator('en')

function sortKey(
  sort: PeopleSort,
  year: number,
): (record: FallRecord) => string | number {
  switch (sort) {
    case 'name':
      return (record) => record.name
    case 'dept':
      return (record) => record.payDepartment.name
    case 'appt':
      return (record) => record.apptPercent
    case 'rate':
      return (record) => record.annualSalaryRateCents
    case 'title':
      return titleOf
    case 'position':
      return (record) => positionOf(record) ?? ''
    case 'group':
      return (record) => TREND_GROUPS.indexOf(trendGroupOf(record, year))
    case 'category':
      return (record) => record.eeoCategory ?? ''
  }
}

function compareKeys(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number'
    ? a - b
    : collator.compare(String(a), String(b))
}

/** The jobs in the sort's order, ties by name and then as published. */
export function sortJobs(
  records: FallRecord[],
  { sort, dir, year }: Pick<PeopleView, 'sort' | 'dir' | 'year'>,
): FallRecord[] {
  const keyOf = sortKey(sort, year)
  const sign = dir === 'asc' ? 1 : -1
  return records
    .map((record) => ({ record, key: keyOf(record) }))
    .sort(
      (a, b) =>
        sign * compareKeys(a.key, b.key) ||
        collator.compare(a.record.name, b.record.name),
    )
    .map(({ record }) => record)
}

/** One page of rows, 1-based, the page clamped to those there are. */
export function pageOf<T>(
  rows: T[],
  page: number,
): { rows: T[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const shown = Math.min(Math.max(page, 1), pageCount)
  const start = (shown - 1) * PAGE_SIZE
  return {
    rows: rows.slice(start, start + PAGE_SIZE),
    page: shown,
    pageCount,
  }
}

export function countNames(records: FallRecord[]): number {
  return new Set(records.map(({ name }) => name)).size
}

/** The distinct values the records publish, sorted, blanks left out. */
export function distinctValues(
  records: FallRecord[],
  fieldOf: (record: FallRecord) => string | null,
): string[] {
  const found = new Set<string>()
  for (const record of records) {
    const value = fieldOf(record)
    if (value) found.add(value)
  }
  return [...found].sort(collator.compare)
}

export type GroupRow = {
  group: TrendGroup
  jobs: number
  medianRateCents: number | null
}

/** Each group with a job: its job count and median rate, as `measureJobs` gives them. */
export function groupSummary(records: FallRecord[], year: number): GroupRow[] {
  return TREND_GROUPS.map((group) => {
    const members = records.filter(
      (record) => trendGroupOf(record, year) === group,
    )
    const { jobs, medianRateCents } = measureJobs(members)
    return { group, jobs, medianRateCents }
  }).filter(({ jobs }) => jobs > 0)
}

const recordIds = new WeakMap<FallRecord, number>()
let nextRecordId = 0

/** A stable key for a record object; UO publishes no job id, and two published jobs can match in every field. */
export function recordKey(record: FallRecord): number {
  const known = recordIds.get(record)
  if (known !== undefined) return known
  nextRecordId += 1
  recordIds.set(record, nextRecordId)
  return nextRecordId
}

/** The distribution with only the bins that overlap the view's rate range. */
export function binsInRange(
  distribution: Distribution,
  { minCents, ceilingCents }: Pick<PeopleView, 'minCents' | 'ceilingCents'>,
): Distribution {
  return {
    ...distribution,
    bins: distribution.bins.filter(
      (bin) =>
        (minCents === null ||
          bin.ceilingCents === null ||
          bin.ceilingCents > minCents) &&
        (ceilingCents === null || bin.floorCents < ceilingCents),
    ),
  }
}

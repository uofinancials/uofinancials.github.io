import type { FallRecord, FallYear, StaffKind } from '../../data/fall.ts'
import {
  compareLines,
  emptyCounts,
  type GroupCounts,
  lineOf,
  type TrendGroup,
  trendGroupOf,
} from '../census/groups.ts'
import { peerGroupOf } from '../people/peer-group.ts'
import { titleOf } from '../people/person-fields.ts'
import { findPersonLinks, type PersonLink } from '../people/person-links.ts'
import { groupBy } from '../shared/group.ts'
import { ALL_PAIRS, isRankRename, normalizeTitle } from './pay-change-labels.ts'
import { type RaiseRow, raiseRowOf } from './raise-groups.ts'
import { MIN_JOBS_SHOWN, medianOf, type TrendFilter } from './trends.ts'

/** A person link whose two primary jobs are the same staff kind and term, as what its earlier job is grouped by and the two published annual salary rates. It holds no name. */
export type ContinuingPair = {
  fromYear: number
  kind: StaffKind
  /** The earlier job's pay department code. */
  dept: string | null
  /** The area the earlier job's census places it in. */
  area: string | null
  group: TrendGroup
  eeoCategory: string | null
  /** The earlier job's `peerGroupOf` key: its class number, rank, or OA grade. */
  peer: string | null
  /** The earlier job's estimated raise row. */
  raise: RaiseRow | null
  fromCents: number
  toCents: number
  /** The change in rate as a fraction of the earlier rate. */
  ratio: number
  /** `null` for a pair of unclassified jobs. */
  isClassChanged: boolean | null
  /** `null` for a pair of classified jobs. */
  rank: 'same' | 'renamed' | 'changed' | 'unpublished' | null
  /** Compared by `normalizeTitle`; a rank rename's title change is not counted. */
  isTitleChanged: boolean
}

function rankChange({
  fromYear,
  from,
  to,
}: PersonLink): ContinuingPair['rank'] {
  if (from.kind !== 'unclassified' || to.kind !== 'unclassified') return null
  if (from.rank === null || to.rank === null) return 'unpublished'
  if (from.rank === to.rank) return 'same'
  return isRankRename(from.rank, to.rank, fromYear + 1) ? 'renamed' : 'changed'
}

export function changeRatio(fromCents: number, toCents: number): number {
  return (toCents - fromCents) / fromCents
}

function toPair(link: PersonLink, area: string | null): ContinuingPair {
  const { fromYear, from, to } = link
  const rank = rankChange(link)
  const peer = peerGroupOf(from)?.key ?? null
  const group = trendGroupOf(from, fromYear)
  return {
    fromYear,
    kind: from.kind,
    dept: from.payDepartment.code,
    area,
    group,
    eeoCategory: from.eeoCategory,
    peer,
    raise: raiseRowOf(from, fromYear, group),
    fromCents: from.annualSalaryRateCents,
    toCents: to.annualSalaryRateCents,
    ratio: changeRatio(from.annualSalaryRateCents, to.annualSalaryRateCents),
    isClassChanged:
      from.kind === 'classified'
        ? peer !== (peerGroupOf(to)?.key ?? null)
        : null,
    rank,
    isTitleChanged:
      rank !== 'renamed' &&
      normalizeTitle(titleOf(from)) !== normalizeTitle(titleOf(to)),
  }
}

/** The area a census places a job in, by the job and its census year. */
export type AreaOf = (record: FallRecord, censusYear: number) => string | null

const noArea: AreaOf = () => null

/** `areaOf` places each pair's earlier job; without it no pair has an area. */
export function continuingPairs(
  years: FallYear[],
  areaOf: AreaOf = noArea,
): ContinuingPair[] {
  return findPersonLinks(years).flatMap((link) => {
    const { fromYear, from, to } = link
    return from.kind !== to.kind ||
      from.termOfServiceMonths !== to.termOfServiceMonths
      ? []
      : [toPair(link, areaOf(from, fromYear))]
  })
}

/** What narrows the pairs: the jobs filter, and a college or VP area code. */
export type PairFilter = TrendFilter & { area: string | null }

/** The pairs in the filter's range whose earlier job passes it. */
export function filterPairs(
  pairs: ContinuingPair[],
  filter: PairFilter,
): ContinuingPair[] {
  return pairs.filter(
    (pair) =>
      pair.fromYear >= filter.from &&
      pair.fromYear + 1 <= filter.to &&
      (filter.kind === 'all' || pair.kind === filter.kind) &&
      (filter.group === null || pair.group === filter.group) &&
      (filter.dept === null || pair.dept === filter.dept) &&
      (filter.area === null || pair.area === filter.area) &&
      (filter.position === null || pair.peer === filter.position),
  )
}

/** The median change over a pair year's pairs; `null` below `MIN_JOBS_SHOWN` pairs. */
export type ChangePoint = {
  fromYear: number
  pairs: number
  median: number | null
}

export type ChangeSeries = { key: string; points: ChangePoint[] }

function measure(fromYear: number, ratios: number[] = []): ChangePoint {
  return {
    fromYear,
    pairs: ratios.length,
    median: ratios.length >= MIN_JOBS_SHOWN ? medianOf(ratios) : null,
  }
}

/** All pairs, then one series per group with a pair, or per published category of an opened group, for each pair year; none without a pair year. */
export function payChangeTrends(
  pairs: ContinuingPair[],
  fromYears: number[],
  opened: TrendGroup | null,
): ChangeSeries[] {
  if (fromYears.length === 0) return []
  const keyed = pairs.map((pair) => ({
    fromYear: pair.fromYear,
    ratio: pair.ratio,
    line: lineOf(pair, pair.group, opened),
  }))
  const ratios = new Map([
    ...groupBy(keyed, ({ fromYear }) => `${ALL_PAIRS}|${fromYear}`),
    ...groupBy(keyed, ({ line, fromYear }) => `${line}|${fromYear}`),
  ])
  const lines = [...new Set(keyed.map(({ line }) => line))].sort(
    compareLines(opened),
  )
  return [ALL_PAIRS, ...lines].map((key) => ({
    key,
    points: fromYears.map((fromYear) =>
      measure(
        fromYear,
        ratios.get(`${key}|${fromYear}`)?.map(({ ratio }) => ratio),
      ),
    ),
  }))
}

const BIN_FLOOR_POINTS = -5
const BIN_CEILING_POINTS = 20
const PERCENT = 100

/** A range of change in whole percentage points, lower bound included; `null` for an open end. */
export type ChangeBin = {
  floor: number | null
  ceiling: number | null
  counts: GroupCounts
  total: number
}

export type ChangeDistribution = {
  bins: ChangeBin[]
  counts: GroupCounts
  total: number
}

function emptyBins(): ChangeBin[] {
  const bin = (floor: number | null, ceiling: number | null): ChangeBin => ({
    floor,
    ceiling,
    counts: emptyCounts(),
    total: 0,
  })
  const inner = Array.from(
    { length: BIN_CEILING_POINTS - BIN_FLOOR_POINTS },
    (_, index) => bin(BIN_FLOOR_POINTS + index, BIN_FLOOR_POINTS + index + 1),
  )
  return [bin(null, BIN_FLOOR_POINTS), ...inner, bin(BIN_CEILING_POINTS, null)]
}

/** The whole percentage points of a pair's change, rounded down, from integer cents so no float error moves a pair across a bin edge. */
function changePoints({ fromCents, toCents }: ContinuingPair): number {
  return Math.floor(((toCents - fromCents) * PERCENT) / fromCents)
}

/** One pair year's changes in 1-point bins from -5% to 20%, with open bins either side, stacked by group. */
export function payChangeDistribution(
  pairs: ContinuingPair[],
): ChangeDistribution {
  const bins = emptyBins()
  const counts = emptyCounts()
  for (const pair of pairs) {
    const points = Math.min(
      Math.max(changePoints(pair), BIN_FLOOR_POINTS - 1),
      BIN_CEILING_POINTS,
    )
    const bin = bins[points - BIN_FLOOR_POINTS + 1]
    if (bin) {
      bin.counts[pair.group] += 1
      bin.total += 1
    }
    counts[pair.group] += 1
  }
  return { bins, counts, total: pairs.length }
}

/** A bin's axis label, e.g. `7%`, `<-5%`, or `20%+`. */
export function changeBinLabel({ floor, ceiling }: ChangeBin): string {
  if (floor === null) return `<${ceiling}%`
  return ceiling === null ? `${floor}%+` : `${floor}%`
}

/** A bin's range, e.g. `7% to under 8%`. */
export function changeBinRange({ floor, ceiling }: ChangeBin): string {
  if (floor === null) return `Under ${ceiling}%`
  return ceiling === null
    ? `${floor}% or more`
    : `${floor}% to under ${ceiling}%`
}

/** One pair year's counts of changed class number, rank, and title, each over the pairs it can apply to. */
export type ChangeCounts = {
  fromYear: number
  pairs: number
  classified: number
  classChanged: number
  unclassified: number
  rankChanged: number
  rankUnpublished: number
  titleChanged: number
}

function countYear(fromYear: number, pairs: ContinuingPair[]): ChangeCounts {
  const count = (isCounted: (pair: ContinuingPair) => boolean) =>
    pairs.filter(isCounted).length
  return {
    fromYear,
    pairs: pairs.length,
    classified: count(({ isClassChanged }) => isClassChanged !== null),
    classChanged: count(({ isClassChanged }) => isClassChanged === true),
    unclassified: count(({ rank }) => rank !== null),
    rankChanged: count(({ rank }) => rank === 'changed'),
    rankUnpublished: count(({ rank }) => rank === 'unpublished'),
    titleChanged: count(({ isTitleChanged }) => isTitleChanged),
  }
}

export function changeCounts(
  pairs: ContinuingPair[],
  fromYears: number[],
): ChangeCounts[] {
  return fromYears.map((fromYear) =>
    countYear(
      fromYear,
      pairs.filter((pair) => pair.fromYear === fromYear),
    ),
  )
}

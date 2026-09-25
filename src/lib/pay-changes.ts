import type { FallRecord, FallYear, StaffKind } from '../data/fall.ts'
import { isClassifiedTemp } from './overview.ts'
import { isRankRename, normalizeTitle } from './pay-change-labels.ts'
import { type PeerGroup, peerGroupOf } from './peer-median.ts'
import { department, titleOf } from './person-fields.ts'
import { findPersonLinks, type PersonLink } from './person-links.ts'
import {
  emptyCounts,
  type GroupCounts,
  TREND_GROUPS,
  type TrendGroup,
  trendGroupOf,
} from './trend-groups.ts'
import { MIN_JOBS_SHOWN, medianOf } from './trends.ts'

/** A census pair's label, e.g. `2024-25`. */
export function pairLabel(fromYear: number): string {
  return `${fromYear}-${String(fromYear + 1).slice(-2)}`
}

/** A person link whose two primary jobs are the same staff kind and term, neither a classified temporary; grouped by the earlier job. */
export type ContinuingPair = {
  fromYear: number
  from: FallRecord
  to: FallRecord
  group: TrendGroup
  /** The earlier job's class number, rank, or OA grade. */
  peer: PeerGroup | null
  /** The change in published annual salary rate as a fraction of the earlier rate. */
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

function toPair(link: PersonLink): ContinuingPair {
  const { fromYear, from, to } = link
  const rank = rankChange(link)
  const peer = peerGroupOf(from)
  return {
    fromYear,
    from,
    to,
    group: trendGroupOf(from, fromYear),
    peer,
    ratio:
      (to.annualSalaryRateCents - from.annualSalaryRateCents) /
      from.annualSalaryRateCents,
    isClassChanged:
      from.kind === 'classified' ? peer?.key !== peerGroupOf(to)?.key : null,
    rank,
    isTitleChanged:
      rank !== 'renamed' &&
      normalizeTitle(titleOf(from)) !== normalizeTitle(titleOf(to)),
  }
}

export function continuingPairs(years: FallYear[]): ContinuingPair[] {
  return findPersonLinks(years).flatMap((link) => {
    const { from, to } = link
    return from.kind !== to.kind ||
      isClassifiedTemp(from) ||
      isClassifiedTemp(to) ||
      from.termOfServiceMonths !== to.termOfServiceMonths
      ? []
      : [toPair(link)]
  })
}

/** Narrows pairs by the earlier job: its staff kind, pay department code, and `peerGroupOf` key. */
export type PayChangeFilter = {
  kind: StaffKind | 'all'
  dept: string | null
  position: string | null
}

export function filterPairs(
  pairs: ContinuingPair[],
  { kind, dept, position }: PayChangeFilter,
): ContinuingPair[] {
  return pairs.filter(
    ({ from, peer }) =>
      (kind === 'all' || from.kind === kind) &&
      (dept === null || from.payDepartment.code === dept) &&
      (position === null || peer?.key === position),
  )
}

/** The median change over a pair year's pairs; `null` below `MIN_JOBS_SHOWN` pairs. */
export type ChangePoint = {
  fromYear: number
  pairs: number
  median: number | null
}

export type ChangeSeries = { key: string; points: ChangePoint[] }

export const ALL_PAIRS = 'All continuing jobs'

function measure(fromYear: number, ratios: number[] = []): ChangePoint {
  return {
    fromYear,
    pairs: ratios.length,
    median: ratios.length >= MIN_JOBS_SHOWN ? medianOf(ratios) : null,
  }
}

/** All pairs, then one series per group with a pair, for each pair year. */
export function payChangeTrends(
  pairs: ContinuingPair[],
  fromYears: number[],
): ChangeSeries[] {
  const ratios = new Map<string, number[]>()
  const add = (key: string, ratio: number) => {
    const bucket = ratios.get(key)
    if (bucket) bucket.push(ratio)
    else ratios.set(key, [ratio])
  }
  for (const { fromYear, group, ratio } of pairs) {
    add(`${ALL_PAIRS}|${fromYear}`, ratio)
    add(`${group}|${fromYear}`, ratio)
  }
  const lines = [
    ALL_PAIRS,
    ...TREND_GROUPS.filter((group) =>
      fromYears.some((fromYear) => ratios.has(`${group}|${fromYear}`)),
    ),
  ]
  return lines.map((key) => ({
    key,
    points: fromYears.map((fromYear) =>
      measure(fromYear, ratios.get(`${key}|${fromYear}`)),
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
function changePoints({ from, to }: ContinuingPair): number {
  return Math.floor(
    ((to.annualSalaryRateCents - from.annualSalaryRateCents) * PERCENT) /
      from.annualSalaryRateCents,
  )
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

/** How the filter's department and class or rank read, from the first pair with them; `null` for one not set. */
export function filterNames(
  pairs: ContinuingPair[],
  { dept, position }: Pick<PayChangeFilter, 'dept' | 'position'>,
): { dept: string | null; position: string | null } {
  const payDepartment =
    dept === null
      ? null
      : pairs.find(({ from }) => from.payDepartment.code === dept)?.from
          .payDepartment
  const peer =
    position === null
      ? null
      : pairs.find(({ peer }) => peer?.key === position)?.peer
  return {
    dept: payDepartment ? department(payDepartment) : dept,
    position: peer?.label ?? position,
  }
}

import type { FallRecord, FallYear, StaffKind } from '../data/fall.ts'
import { MIN_JOBS_SHOWN } from './department-jobs.ts'
import { isClassifiedTemp } from './overview.ts'
import { isRankRename, normalizeTitle } from './pay-change-labels.ts'
import { peerGroupOf } from './peer-median.ts'
import { findPersonLinks } from './person-links.ts'
import { emptyCounts } from './salary-distribution.ts'
import { TREND_GROUPS, type TrendGroup, trendGroupOf } from './trend-groups.ts'
import { percentileOf } from './trends.ts'

const MEDIAN = 50

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
  /** The change in published annual salary rate as a fraction of the earlier rate. */
  ratio: number
}

export function continuingPairs(years: FallYear[]): ContinuingPair[] {
  return findPersonLinks(years).flatMap(({ fromYear, from, to }) =>
    from.kind !== to.kind ||
    isClassifiedTemp(from) ||
    isClassifiedTemp(to) ||
    from.termOfServiceMonths !== to.termOfServiceMonths
      ? []
      : [
          {
            fromYear,
            from,
            to,
            group: trendGroupOf(from, fromYear),
            ratio:
              (to.annualSalaryRateCents - from.annualSalaryRateCents) /
              from.annualSalaryRateCents,
          },
        ],
  )
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
    ({ from }) =>
      (kind === 'all' || from.kind === kind) &&
      (dept === null || from.payDepartment.code === dept) &&
      (position === null || peerGroupOf(from)?.key === position),
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

function measure(fromYear: number, ratios: number[]): ChangePoint {
  const sorted = [...ratios].sort((a, b) => a - b)
  return {
    fromYear,
    pairs: sorted.length,
    median:
      sorted.length >= MIN_JOBS_SHOWN ? percentileOf(sorted, MEDIAN) : null,
  }
}

/** All pairs, then one series per group with a pair, for each pair year. */
export function payChangeTrends(
  pairs: ContinuingPair[],
  fromYears: number[],
): ChangeSeries[] {
  const lineOf = (key: string, inLine: (pair: ContinuingPair) => boolean) => ({
    key,
    points: fromYears.map((fromYear) =>
      measure(
        fromYear,
        pairs
          .filter((pair) => pair.fromYear === fromYear && inLine(pair))
          .map(({ ratio }) => ratio),
      ),
    ),
  })
  const groups = TREND_GROUPS.filter((group) =>
    pairs.some((pair) => pair.group === group),
  )
  return [
    lineOf(ALL_PAIRS, () => true),
    ...groups.map((group) => lineOf(group, (pair) => pair.group === group)),
  ]
}

const BIN_FLOOR_POINTS = -5
const BIN_CEILING_POINTS = 20
const PERCENT = 100

/** A range of change in whole percentage points, lower bound included; `null` for an open end. */
export type ChangeBin = {
  floor: number | null
  ceiling: number | null
  counts: Record<TrendGroup, number>
  total: number
}

export type ChangeDistribution = {
  bins: ChangeBin[]
  counts: Record<TrendGroup, number>
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
  return { bins, counts }
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

function titleOf(record: FallRecord): string {
  return record.kind === 'classified' ? record.jobTitle : record.academicTitle
}

function isRenamed({ fromYear, from, to }: ContinuingPair): boolean {
  return (
    from.kind === 'unclassified' &&
    to.kind === 'unclassified' &&
    from.rank !== null &&
    to.rank !== null &&
    isRankRename(from.rank, to.rank, fromYear + 1)
  )
}

function countYear(fromYear: number, pairs: ContinuingPair[]): ChangeCounts {
  const counts: ChangeCounts = {
    fromYear,
    pairs: pairs.length,
    classified: 0,
    classChanged: 0,
    unclassified: 0,
    rankChanged: 0,
    rankUnpublished: 0,
    titleChanged: 0,
  }
  for (const pair of pairs) {
    const { from, to } = pair
    const isRename = isRenamed(pair)
    if (
      !isRename &&
      normalizeTitle(titleOf(from)) !== normalizeTitle(titleOf(to))
    ) {
      counts.titleChanged += 1
    }
    if (from.kind === 'classified' && to.kind === 'classified') {
      counts.classified += 1
      if (from.positionClass?.code.slice(1) !== to.positionClass?.code.slice(1))
        counts.classChanged += 1
    } else if (from.kind === 'unclassified' && to.kind === 'unclassified') {
      counts.unclassified += 1
      if (from.rank === null || to.rank === null) counts.rankUnpublished += 1
      else if (from.rank !== to.rank && !isRename) counts.rankChanged += 1
    }
  }
  return counts
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
  const inDept =
    dept === null
      ? undefined
      : pairs.find(({ from }) => from.payDepartment.code === dept)
  const inPosition =
    position === null
      ? undefined
      : pairs.find(({ from }) => peerGroupOf(from)?.key === position)
  return {
    dept:
      dept === null
        ? null
        : inDept
          ? `${inDept.from.payDepartment.name} (${dept})`
          : dept,
    position:
      position === null
        ? null
        : ((inPosition && peerGroupOf(inPosition.from)?.label) ?? position),
  }
}

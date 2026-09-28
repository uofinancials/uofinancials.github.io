import type { TrendGroup } from '../census/groups.ts'
import { changeOf } from '../shared/series.ts'
import type { ChangeSeries } from './pay-changes.ts'
import { METRIC_INFO, type ReportMetric } from './search.ts'
import type { TrendPoint, TrendSeries, Trends } from './trends.ts'

const INDEX_BASE = 100

export const ALL_JOBS = 'All jobs'

/** The groups counted over each 100 faculty jobs. */
export const RATIO_GROUPS: readonly TrendGroup[] = [
  'Admins and professionals',
  'Executives',
]
export const RATIO_BASE_GROUP: TrendGroup = 'Faculty'

/** Their rates are annualised hourly rates, so they have FTE but no spend. */
const UNPAID_GROUP: TrendGroup = 'Classified temporaries'

/** Each value over the first times 100; `null` when the first is missing or not above zero, so the line has no index. */
export function indexValues(
  values: (number | null)[],
): (number | null)[] | null {
  const [base] = values
  if (base === undefined || base === null || base <= 0) return null
  return values.map((value) =>
    value === null ? null : (value / base) * INDEX_BASE,
  )
}

export type ChangeRow = { key: string } & Record<ReportMetric, number | null>

function changeRow(key: string, points: TrendPoint[]): ChangeRow {
  const first = points[0]
  const last = points.at(-1)
  const changeIn = (metric: ReportMetric) => {
    const { pick } = METRIC_INFO[metric]
    return first && last ? changeOf(pick(first), pick(last)) : null
  }
  return {
    key,
    jobs: changeIn('jobs'),
    fte: changeIn('fte'),
    spend: changeIn('spend'),
    median: changeIn('median'),
  }
}

/** Each group's change from the first year to the last in every measure, then all jobs'. */
export function changeTable({ series, total }: Trends): ChangeRow[] {
  return [
    ...series.map(({ key, points }) => changeRow(key, points)),
    changeRow(ALL_JOBS, total),
  ]
}

function pointOf(series: TrendSeries[], key: string, index: number) {
  return series.find((line) => line.key === key)?.points[index]
}

/** `RATIO_GROUPS` jobs per 100 `RATIO_BASE_GROUP` jobs in each census; `null` in a census with no faculty job. */
export function staffingRatio({ series, total }: Trends): (number | null)[] {
  return total.map((_, index) => {
    const faculty = pointOf(series, RATIO_BASE_GROUP, index)?.jobs ?? 0
    const counted = RATIO_GROUPS.reduce(
      (sum, group) => sum + (pointOf(series, group, index)?.jobs ?? 0),
      0,
    )
    return faculty === 0 ? null : (counted / faculty) * INDEX_BASE
  })
}

/** A point's spend, 0 when it has no job; `null` when its jobs are too few to show spend. */
function spendOf(point: TrendPoint | undefined): number | null {
  if (!point || point.jobs === 0) return 0
  return point.spendCents
}

/** Each group's share of all spend in one census, for the groups with spend. */
export function spendShares(
  { series, total }: Trends,
  index: number,
): { key: string; share: number }[] {
  const whole = total[index]?.spendCents ?? null
  if (whole === null || whole <= 0) return []
  return series.flatMap(({ key, points }) => {
    const spend = points[index]?.spendCents ?? null
    return spend === null ? [] : [{ key, share: spend / whole }]
  })
}

export type SpendContribution = {
  key: string
  changeCents: number | null
  /** Of the change in all spend; `null` when either change is missing or all spend did not change. */
  share: number | null
}

/** Each group's change in spend from the first census to the last and its share of the change in all spend, then all jobs'. */
export function spendContributions({
  series,
  total,
}: Trends): SpendContribution[] {
  const changeCents = (points: TrendPoint[]) => {
    const first = spendOf(points[0])
    const last = spendOf(points.at(-1))
    return first === null || last === null ? null : last - first
  }
  const whole = changeCents(total)
  const shareOf = (part: number | null) =>
    part === null || whole === null || whole === 0 ? null : part / whole
  return [
    ...series
      .filter(({ key }) => key !== UNPAID_GROUP)
      .map(({ key, points }) => {
        const part = changeCents(points)
        return { key, changeCents: part, share: shareOf(part) }
      }),
    { key: ALL_JOBS, changeCents: whole, share: whole === null ? null : 1 },
  ]
}

export type VolumeAndPay = {
  fteChange: number | null
  perFteChange: number | null
  /** The change in FTE at the first census's spend per FTE. */
  volumeCents: number
  /** The rest of the change in spend. */
  payCents: number
  changeCents: number
}

function paidFte({ series, total }: Trends, index: number): number | null {
  const all = total[index]?.fteHundredths ?? null
  if (all === null) return null
  return all - (pointOf(series, UNPAID_GROUP, index)?.fteHundredths ?? 0)
}

/** The change in all spend from the first census to the last, split into more FTE at the first census's spend per FTE and the rest; FTE leaves out classified temporaries, as spend does. `null` when either census lacks spend or FTE. */
export function volumeAndPay(trends: Trends): VolumeAndPay | null {
  const lastIndex = trends.total.length - 1
  const firstSpend = trends.total[0]?.spendCents ?? null
  const lastSpend = trends.total[lastIndex]?.spendCents ?? null
  const firstFte = paidFte(trends, 0)
  const lastFte = paidFte(trends, lastIndex)
  if (
    firstSpend === null ||
    lastSpend === null ||
    firstFte === null ||
    lastFte === null ||
    firstFte <= 0 ||
    lastFte <= 0
  ) {
    return null
  }
  const changeCents = lastSpend - firstSpend
  const volumeCents = Math.round(((lastFte - firstFte) * firstSpend) / firstFte)
  return {
    fteChange: changeOf(firstFte, lastFte),
    perFteChange: changeOf(firstSpend / firstFte, lastSpend / lastFte),
    volumeCents,
    payCents: changeCents - volumeCents,
    changeCents,
  }
}

/** Each paid group's change in FTE and in spend per FTE, from the first census to the last. */
export function volumeAndPayByGroup({
  series,
}: Trends): { key: string; fte: number | null; perFte: number | null }[] {
  const perFte = (point: TrendPoint | undefined) =>
    !point || point.spendCents === null || !point.fteHundredths
      ? null
      : point.spendCents / point.fteHundredths
  return series
    .filter(({ key }) => key !== UNPAID_GROUP)
    .map(({ key, points }) => ({
      key,
      fte: changeOf(
        points[0]?.fteHundredths ?? null,
        points.at(-1)?.fteHundredths ?? null,
      ),
      perFte: changeOf(perFte(points[0]), perFte(points.at(-1))),
    }))
}

/** One change after another, compounded; `null` when there is none or any is missing. */
export function chainedChange(changes: (number | null)[]): number | null {
  if (changes.length === 0 || changes.includes(null)) return null
  return (
    changes.reduce<number>(
      (product, change) => product * (1 + (change ?? 0)),
      1,
    ) - 1
  )
}

export type RaiseRow = {
  key: string
  medians: (number | null)[]
  chained: number | null
}

/** Each line's median change for the given pairs, and those medians chained. */
export function raiseRows(
  series: ChangeSeries[],
  fromYears: number[],
): RaiseRow[] {
  return series.map(({ key, points }) => {
    const medians = fromYears.map(
      (year) =>
        points.find(({ fromYear }) => fromYear === year)?.median ?? null,
    )
    return { key, medians, chained: chainedChange(medians) }
  })
}

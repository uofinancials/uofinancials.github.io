import { changeOf } from '../shared/series.ts'
import { ALL_JOBS, atEitherEnd } from './report.ts'
import type { TrendPoint, TrendSeries, Trends } from './trends.ts'

/** A point's spend, 0 when it has no job; `null` when its jobs are too few to show spend. */
function spendOf(point: TrendPoint | undefined): number | null {
  if (!point || point.jobs === 0) return 0
  return point.spendCents
}

/** The groups with a job at either end and spend shown at one of them. */
function withSpend(series: TrendSeries[]): TrendSeries[] {
  return atEitherEnd(series).filter(
    ({ points }) =>
      (points[0]?.spendCents ?? null) !== null ||
      (points.at(-1)?.spendCents ?? null) !== null,
  )
}

export type SpendShareRow = {
  key: string
  first: number | null
  last: number | null
}

/** Each group's share of all spend in the first and the last census. */
export function spendShares({ series, total }: Trends): SpendShareRow[] {
  const shareAt = (points: TrendPoint[], index: number) => {
    const whole = total.at(index)?.spendCents ?? null
    const spend = points.at(index)?.spendCents ?? null
    return spend === null || whole === null || whole <= 0 ? null : spend / whole
  }
  return withSpend(series).map(({ key, points }) => ({
    key,
    first: shareAt(points, 0),
    last: shareAt(points, -1),
  }))
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
    ...withSpend(series).map(({ key, points }) => {
      const part = changeCents(points)
      return { key, changeCents: part, share: shareOf(part) }
    }),
    { key: ALL_JOBS, changeCents: whole, share: whole === null ? null : 1 },
  ]
}

export type VolumeAndPay = {
  firstCents: number
  fteChange: number | null
  perFteChange: number | null
  /** The change in FTE at the first census's spend per FTE. */
  volumeCents: number
  /** The rest of the change in spend. */
  payCents: number
  changeCents: number
}

/** The change in all spend from the first census to the last, split into more FTE at the first census's spend per FTE and the rest; spend and FTE cover the same jobs. `null` when either census lacks spend or FTE. */
export function volumeAndPay({ total }: Trends): VolumeAndPay | null {
  const firstCents = total[0]?.spendCents ?? null
  const lastCents = total.at(-1)?.spendCents ?? null
  const firstFte = total[0]?.fteHundredths ?? null
  const lastFte = total.at(-1)?.fteHundredths ?? null
  if (
    firstCents === null ||
    lastCents === null ||
    firstFte === null ||
    lastFte === null ||
    firstFte <= 0 ||
    lastFte <= 0
  ) {
    return null
  }
  const changeCents = lastCents - firstCents
  const volumeCents = Math.round(((lastFte - firstFte) * firstCents) / firstFte)
  return {
    firstCents,
    fteChange: changeOf(firstFte, lastFte),
    perFteChange: changeOf(firstCents / firstFte, lastCents / lastFte),
    volumeCents,
    payCents: changeCents - volumeCents,
    changeCents,
  }
}

function perFte(point: TrendPoint | undefined): number | null {
  return !point || point.spendCents === null || !point.fteHundredths
    ? null
    : point.spendCents / point.fteHundredths
}

/** Each paid group's change in FTE and in spend per FTE from the first census to the last, then all jobs' from the split. */
export function volumeAndPayByGroup(
  { series }: Trends,
  split: VolumeAndPay,
): { key: string; fte: number | null; perFte: number | null }[] {
  return [
    ...withSpend(series).map(({ key, points }) => ({
      key,
      fte: changeOf(
        points[0]?.fteHundredths ?? null,
        points.at(-1)?.fteHundredths ?? null,
      ),
      perFte: changeOf(perFte(points[0]), perFte(points.at(-1))),
    })),
    { key: ALL_JOBS, fte: split.fteChange, perFte: split.perFteChange },
  ]
}

/** The first census's spend, the two parts of the change, and the last census's spend as bars along one axis: each part starts where the one before ends, and each offset and width is a fraction of the longest reach. */
export function stepBars({
  firstCents,
  volumeCents,
  changeCents,
}: VolumeAndPay) {
  const steps = [
    { key: 'first', from: 0, to: firstCents },
    { key: 'volume', from: firstCents, to: firstCents + volumeCents },
    {
      key: 'pay',
      from: firstCents + volumeCents,
      to: firstCents + changeCents,
    },
    { key: 'last', from: 0, to: firstCents + changeCents },
  ]
  const reach = Math.max(...steps.flatMap(({ from, to }) => [from, to]))
  return steps.map(({ key, from, to }) => ({
    key,
    cents: to - from,
    offset: reach <= 0 ? 0 : Math.min(from, to) / reach,
    width: reach <= 0 ? 0 : Math.abs(to - from) / reach,
  }))
}

import {
  formatChange,
  formatDollars,
  formatList,
  formatRatio,
  formatShare,
  tabTitleOf,
} from '../shared/format.ts'
import { rankByChange } from '../shared/series.ts'
import { pairLabel } from './pay-change-labels.ts'
import { ALL_JOBS, type ChangeRow, type RaiseRow } from './report.ts'
import { ALL_OF_UO } from './scope.ts'
import {
  METRIC_INFO,
  REPORT_TAB_LABELS,
  type ReportMetric,
  type ReportTab,
  type YearRange,
} from './search.ts'
import type { SpendContribution, VolumeAndPay } from './spend.ts'

/** All jobs' change in a measure since the first census, and the groups among the rows with the largest and smallest change. */
export function growthAnswer(
  rows: ChangeRow[],
  metric: ReportMetric,
  from: number,
): string | null {
  const all = rows.find(({ key }) => key === ALL_JOBS)?.[metric] ?? null
  const { ranked } = rankByChange(
    rows
      .filter(({ key }) => key !== ALL_JOBS)
      .map((row) => ({ key: row.key, change: row[metric] })),
  )
  const largest = ranked[0]
  const smallest = ranked.at(-1)
  if (all === null || !largest || !smallest || largest === smallest) {
    return null
  }
  return `${METRIC_INFO[metric].label} since Fall ${from}: ${formatChange(all)} for all jobs. ${largest.key} changed most, ${formatChange(largest.change)}, and ${smallest.key} least, ${formatChange(smallest.change)}.`
}

/** Why some groups are not charted: they have no value in the first census to measure from. */
export function unindexedNote(
  keys: string[],
  metric: ReportMetric,
  from: number,
): string | null {
  if (keys.length === 0) return null
  const isOne = keys.length === 1
  return `${formatList(keys)} ${isOne ? 'has' : 'have'} no ${METRIC_INFO[metric].noun} shown in Fall ${from}, so ${isOne ? 'it is' : 'they are'} not charted; the table has ${isOne ? 'its' : 'their'} figures.`
}

export function ratioAnswer(
  ratios: (number | null)[],
  { from, to }: YearRange,
): string | null {
  const first = ratios[0]
  const last = ratios.at(-1)
  if (
    first === undefined ||
    first === null ||
    last === undefined ||
    last === null
  ) {
    return null
  }
  return `${formatRatio(first)} in Fall ${from}, ${formatRatio(last)} in Fall ${to}.`
}

/** The change in all spend, and the group with the largest share of a rise. */
export function moneyAnswer(
  contributions: SpendContribution[],
  { from, to }: YearRange,
): string | null {
  const whole = contributions.find(({ key }) => key === ALL_JOBS)?.changeCents
  if (whole === undefined || whole === null) return null
  const verb = whole >= 0 ? 'rose' : 'fell'
  const change = `Salary spend ${verb} ${formatDollars(Math.abs(whole))} from Fall ${from} to Fall ${to}.`
  const [top] = contributions
    .filter(({ key, changeCents }) => key !== ALL_JOBS && changeCents !== null)
    .sort((a, b) => (b.changeCents ?? 0) - (a.changeCents ?? 0))
  if (whole <= 0 || !top?.changeCents) return change
  return `${change} ${top.key} took ${formatShare(top.changeCents, whole)} of the rise.`
}

/** Whether more FTE or higher pay per FTE made more of the change in spend, and by how much. */
export function splitAnswer(split: VolumeAndPay, from: number): string | null {
  if (split.fteChange === null || split.perFteChange === null) return null
  const most =
    Math.abs(split.payCents) >= Math.abs(split.volumeCents)
      ? 'higher pay per FTE'
      : 'more FTE'
  return `Mostly ${most}: FTE changed ${formatChange(split.fteChange)} and salary spend per FTE ${formatChange(split.perFteChange)}. Of the ${formatDollars(split.changeCents)} change in spend, ${formatDollars(split.volumeCents)} is the change in FTE at Fall ${from} spend per FTE and ${formatDollars(split.payCents)} is the rest.`
}

/** All continuing jobs' median changes, chained over the pairs shown. */
export function raisesAnswer(
  rows: RaiseRow[],
  fromYears: number[],
): string | null {
  const chained = rows[0]?.chained ?? null
  const first = fromYears[0]
  const last = fromYears.at(-1)
  if (chained === null || first === undefined || last === undefined) {
    return null
  }
  return `Chained, the median change for all continuing jobs from Fall ${pairLabel(first)} to ${pairLabel(last)} comes to ${formatChange(chained)}.`
}

/** The report's h1, naming the scope the filters pick. */
export function reportHeading(scopeName: string, from: number): string {
  return scopeName === ALL_OF_UO
    ? `How University of Oregon jobs and pay have changed since Fall ${from}`
    : `How jobs and pay have changed in ${scopeName} since Fall ${from}`
}

/** The report's browser tab title: the question, then the scope. */
export function reportTabTitle(tab: ReportTab, scopeName: string): string {
  return tabTitleOf(REPORT_TAB_LABELS[tab], scopeName, 'Trends')
}

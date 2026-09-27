import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { FallYear } from '@/data/fall'
import { raiseTermsQuery } from '@/data/queries'
import {
  type ContinuingPair,
  changeCounts,
  continuingPairs,
  filterPairs,
  payChangeDistribution,
  payChangeTrends,
} from '@/lib/pay-changes'
import { viewRaiseComparison } from '@/lib/raise-comparison'
import type { TrendFilter } from '@/lib/trends'
import { CHANGE_METRIC, type TrendView } from '@/lib/trends-search'

const pairsByYears = new WeakMap<FallYear[], ContinuingPair[]>()

function pairsOf(fallYears: FallYear[]): ContinuingPair[] {
  const cached = pairsByYears.get(fallYears)
  if (cached) return cached
  const pairs = continuingPairs(fallYears)
  pairsByYears.set(fallYears, pairs)
  return pairs
}

/** The change measure's figures for the view and its filter; `null` under any other measure, so the continuing pairs are built only for it. */
export function usePayChanges(
  fallYears: FallYear[],
  view: TrendView,
  filter: TrendFilter,
) {
  const isChange = view.metric === CHANGE_METRIC
  const pairs = isChange ? pairsOf(fallYears) : null
  const { group, fromYears, pair } = view
  const { data: raiseTerms } = useSuspenseQuery(raiseTermsQuery)
  const raises = useMemo(
    () =>
      pairs &&
      viewRaiseComparison({
        pairs,
        filter,
        fromYear: pair,
        years: fallYears,
        raises: raiseTerms,
      }),
    [pairs, fallYears, raiseTerms, filter, pair],
  )
  const shown = useMemo(
    () => pairs && filterPairs(pairs, filter),
    [pairs, filter],
  )
  return useMemo(
    () =>
      shown && {
        fromYears,
        series: payChangeTrends(shown, fromYears, group),
        counts: changeCounts(shown, fromYears),
        distribution: payChangeDistribution(
          shown.filter(({ fromYear }) => fromYear === pair),
        ),
        raises,
      },
    [shown, fromYears, group, pair, raises],
  )
}

export type PayChanges = NonNullable<ReturnType<typeof usePayChanges>>

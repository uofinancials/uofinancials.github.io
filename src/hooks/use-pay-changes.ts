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
} from '@/lib/trends/pay-changes'
import { viewRaiseComparison } from '@/lib/trends/raise-comparison'
import type { TrendView } from '@/lib/trends/search'
import type { TrendFilter } from '@/lib/trends/trends'

const pairsByYears = new WeakMap<FallYear[], ContinuingPair[]>()

function pairsOf(fallYears: FallYear[]): ContinuingPair[] {
  const cached = pairsByYears.get(fallYears)
  if (cached) return cached
  const pairs = continuingPairs(fallYears)
  pairsByYears.set(fallYears, pairs)
  return pairs
}

/** The pay changes of the continuing jobs the view and its filter select. */
export function usePayChanges(
  fallYears: FallYear[],
  view: TrendView,
  filter: TrendFilter,
) {
  const pairs = pairsOf(fallYears)
  const { group, fromYears, pair } = view
  const { data: raiseTerms } = useSuspenseQuery(raiseTermsQuery)
  const raises = useMemo(
    () =>
      viewRaiseComparison({
        pairs,
        filter,
        fromYear: pair,
        years: fallYears,
        raises: raiseTerms,
      }),
    [pairs, fallYears, raiseTerms, filter, pair],
  )
  const shown = useMemo(() => filterPairs(pairs, filter), [pairs, filter])
  return useMemo(
    () => ({
      fromYears,
      series: payChangeTrends(shown, fromYears, group),
      counts: changeCounts(shown, fromYears),
      distribution: payChangeDistribution(
        shown.filter(({ fromYear }) => fromYear === pair),
      ),
      raises,
    }),
    [shown, fromYears, group, pair, raises],
  )
}

export type PayChanges = ReturnType<typeof usePayChanges>

import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { FallYear } from '@/data/fall'
import { raiseTermsQuery } from '@/data/queries'
import { areaPlacer, type DepartmentCensus } from '@/lib/departments/jobs'
import {
  changeCounts,
  continuingPairs,
  filterPairs,
  type PairFilter,
  payChangeDistribution,
  payChangeTrends,
} from '@/lib/trends/pay-changes'
import { viewRaiseComparison } from '@/lib/trends/raise-comparison'
import type { TrendView } from '@/lib/trends/search'

/** The pay changes of the continuing jobs the view and its filter select; `placed` are the censuses that place a job in its area, none when no area is asked for. */
export function usePayChanges(
  { fallYears, placed }: { fallYears: FallYear[]; placed: DepartmentCensus[] },
  view: TrendView,
  filter: PairFilter,
) {
  const pairs = useMemo(
    () =>
      continuingPairs(
        fallYears,
        placed.length > 0 ? areaPlacer(placed) : undefined,
      ),
    [fallYears, placed],
  )
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

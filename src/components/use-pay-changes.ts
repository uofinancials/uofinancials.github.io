import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { FallYear } from '@/data/fall'
import { raiseTermsQuery } from '@/data/queries'
import {
  changeCounts,
  continuingPairs,
  filterPairs,
  payChangeDistribution,
  payChangeTrends,
} from '@/lib/pay-changes'
import { censusWindow, raiseComparison } from '@/lib/raise-comparison'
import { CHANGE_METRIC, type TrendView } from '@/lib/trends-search'

/** The change measure's figures for the view; `null` under any other measure, so the continuing pairs are built only for it. */
export function usePayChanges(fallYears: FallYear[], view: TrendView) {
  const isChange = view.metric === CHANGE_METRIC
  const pairs = useMemo(
    () => (isChange ? continuingPairs(fallYears) : null),
    [fallYears, isChange],
  )
  const { kind, group, dept, position, from, to, fromYears, pair } = view
  const { data: raiseTerms } = useSuspenseQuery(raiseTermsQuery)
  const raises = useMemo(() => {
    const window = censusWindow(fallYears, pair)
    if (!pairs || !window) return null
    const pairYear = pairs.filter(({ fromYear }) => fromYear === pair)
    return raiseComparison(
      filterPairs(pairYear, { kind, group: null, dept, position, from, to }),
      raiseTerms,
      window,
    )
  }, [pairs, fallYears, raiseTerms, kind, dept, position, from, to, pair])
  const shown = useMemo(
    () =>
      pairs && filterPairs(pairs, { kind, group, dept, position, from, to }),
    [pairs, kind, group, dept, position, from, to],
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

import { useMemo } from 'react'
import type { FallYear } from '@/data/fall'
import {
  changeCounts,
  continuingPairs,
  filterPairs,
  pairYears,
  payChangeTrends,
} from '@/lib/pay-changes'
import { CHANGE_METRIC, type TrendView } from '@/lib/trends-search'

/** The change measure's continuing pairs and figures for the view; `null` under any other measure, so the pairs are built only for it. */
export function usePayChanges(
  fallYears: FallYear[],
  years: number[],
  view: TrendView,
) {
  const isChange = view.metric === CHANGE_METRIC
  const pairs = useMemo(
    () => (isChange ? continuingPairs(fallYears) : null),
    [fallYears, isChange],
  )
  const { kind, group, dept, position, from, to } = view
  return useMemo(() => {
    if (!pairs) return null
    const fromYears = pairYears(years, from, to)
    const shown = filterPairs(pairs, { kind, group, dept, position, from, to })
    return {
      fromYears,
      shown,
      series: payChangeTrends(shown, fromYears, group),
      counts: changeCounts(shown, fromYears),
    }
  }, [pairs, years, kind, group, dept, position, from, to])
}

export type PayChanges = NonNullable<ReturnType<typeof usePayChanges>>

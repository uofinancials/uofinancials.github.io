import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { PayChangesFile } from '@/data/pay-changes'
import { manifestQuery, payChangesQuery, raiseTermsQuery } from '@/data/queries'
import { decodePairs } from '@/lib/trends/pair-file'
import {
  type ContinuingPair,
  changeCounts,
  filterPairs,
  type PairFilter,
  payChangeDistribution,
  payChangeTrends,
} from '@/lib/trends/pay-changes'
import { viewRaiseComparison } from '@/lib/trends/raise-comparison'
import type { TrendView } from '@/lib/trends/search'

const pairsByFile = new WeakMap<PayChangesFile, ContinuingPair[]>()

function pairsOf(file: PayChangesFile): ContinuingPair[] {
  const cached = pairsByFile.get(file)
  if (cached) return cached
  const pairs = decodePairs(file)
  pairsByFile.set(file, pairs)
  return pairs
}

/** The pay changes of the continuing jobs the view selects, from the pay changes file. */
export function usePayChanges(view: TrendView) {
  const { data: file } = useSuspenseQuery(payChangesQuery)
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const { data: raiseTerms } = useSuspenseQuery(raiseTermsQuery)
  const pairs = pairsOf(file)
  const { kind, group, dept, area, position, from, to, fromYears, pair } = view
  const filter = useMemo(
    (): PairFilter => ({ kind, group, dept, area, position, from, to }),
    [kind, group, dept, area, position, from, to],
  )
  const raises = useMemo(
    () =>
      viewRaiseComparison({
        pairs,
        filter,
        fromYear: pair,
        years: manifest.fall,
        raises: raiseTerms,
      }),
    [pairs, manifest, raiseTerms, filter, pair],
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

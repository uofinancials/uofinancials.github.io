import {
  type QueryObserverResult,
  useQueries,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { budgetYearQuery, fallYearQuery, manifestQuery } from '@/data/queries'
import {
  type DepartmentCensus,
  toDepartmentCensuses,
} from '@/lib/department-jobs'

export type ScenarioHistory =
  | { status: 'idle' | 'loading' | 'error'; history: [] }
  | { status: 'ready'; history: DepartmentCensus[] }

const NO_HISTORY: [] = []

function combineResults<T>(results: QueryObserverResult<T>[]) {
  return {
    data: results.flatMap((result) =>
      result.data === undefined ? [] : [result.data],
    ),
    isPending: results.some((result) => result.isPending),
    isError: results.some((result) => result.isError),
  }
}

/** The censuses a freeze's turnover is read from, loaded only while `hasFreeze`. */
export function useScenarioHistory(
  hasFreeze: boolean,
  censuses: { year: number; fiscalYear: number }[],
): ScenarioHistory {
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const loaded = hasFreeze ? censuses : []
  const falls = useQueries({
    queries: loaded.map(({ year }) => fallYearQuery(year)),
    combine: combineResults,
  })
  const budgets = useQueries({
    queries: [...new Set(loaded.map(({ fiscalYear }) => fiscalYear))].map(
      budgetYearQuery,
    ),
    combine: combineResults,
  })
  const isReady =
    hasFreeze &&
    !falls.isPending &&
    !budgets.isPending &&
    !falls.isError &&
    !budgets.isError
  const history = useMemo(
    () =>
      isReady ? toDepartmentCensuses(manifest, falls.data, budgets.data) : null,
    [isReady, manifest, falls.data, budgets.data],
  )
  if (history) return { status: 'ready', history }
  if (!hasFreeze) return { status: 'idle', history: NO_HISTORY }
  return falls.isError || budgets.isError
    ? { status: 'error', history: NO_HISTORY }
    : { status: 'loading', history: NO_HISTORY }
}

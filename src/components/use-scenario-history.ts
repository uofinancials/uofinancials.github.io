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

/** Every query's data once all have it, `null` before, or `'error'` when one failed. */
function allData<T>(results: QueryObserverResult<T>[]): T[] | null | 'error' {
  if (results.some((result) => result.isError)) return 'error'
  const data = results.flatMap((result) =>
    result.data === undefined ? [] : [result.data],
  )
  return data.length === results.length ? data : null
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
    combine: allData,
  })
  const budgets = useQueries({
    queries: [...new Set(loaded.map(({ fiscalYear }) => fiscalYear))].map(
      budgetYearQuery,
    ),
    combine: allData,
  })
  const history = useMemo(
    () =>
      Array.isArray(falls) && Array.isArray(budgets)
        ? toDepartmentCensuses(manifest, falls, budgets)
        : null,
    [manifest, falls, budgets],
  )
  if (!hasFreeze) return { status: 'idle', history: NO_HISTORY }
  if (falls === 'error' || budgets === 'error') {
    return { status: 'error', history: NO_HISTORY }
  }
  return history
    ? { status: 'ready', history }
    : { status: 'loading', history: NO_HISTORY }
}

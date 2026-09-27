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

function withJoined(
  others: DepartmentCensus[],
  censuses: { year: number }[],
  joined: DepartmentCensus,
): DepartmentCensus[] {
  return censuses.some(({ year }) => year === joined.year)
    ? [...others, joined].sort((a, b) => a.year - b.year)
    : others
}

/** The censuses a freeze's turnover is read from, loaded only while `hasFreeze`; the page's `census` stands in for its own year. */
export function useScenarioHistory(
  hasFreeze: boolean,
  {
    historyCensuses: censuses,
    census: joined,
  }: {
    historyCensuses: { year: number; fiscalYear: number }[]
    census: DepartmentCensus
  },
): ScenarioHistory {
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const loaded = hasFreeze
    ? censuses.filter(({ year }) => year !== joined.year)
    : []
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
      isReady
        ? withJoined(
            toDepartmentCensuses(manifest, falls.data, budgets.data),
            censuses,
            joined,
          )
        : null,
    [isReady, manifest, falls.data, budgets.data, censuses, joined],
  )
  if (history) return { status: 'ready', history }
  if (!hasFreeze) return { status: 'idle', history: NO_HISTORY }
  return falls.isError || budgets.isError
    ? { status: 'error', history: NO_HISTORY }
    : { status: 'loading', history: NO_HISTORY }
}

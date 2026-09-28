import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { FallYear } from '@/data/fall'
import { budgetYearQuery, manifestQuery, toData } from '@/data/queries'
import { toDepartmentCensuses } from '@/lib/departments/jobs'

/** The given budget years, and each census joined to the one that names its areas; no censuses when no budget year is given. */
export function useDepartmentCensuses(
  fiscalYears: number[],
  falls: FallYear[],
) {
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const budgets = useSuspenseQueries({
    queries: fiscalYears.map(budgetYearQuery),
    combine: toData,
  })
  const censuses = useMemo(
    () =>
      budgets.length === 0
        ? []
        : toDepartmentCensuses(manifest, falls, budgets),
    [manifest, falls, budgets],
  )
  return { budgets, censuses }
}

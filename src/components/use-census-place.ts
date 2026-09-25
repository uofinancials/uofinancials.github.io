import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { budgetYearQuery, fallYearQuery } from '@/data/queries'
import { listAreas } from '@/lib/areas'
import { describePlace, placeJobs } from '@/lib/census-search'
import { toDepartmentCensus } from '@/lib/department-jobs'
import { positionLabel } from '@/lib/salary-distribution'

/** One census's jobs placed in the chosen department or area, with the areas to choose from and the chosen class or rank's name. */
export function useCensusPlace({
  year,
  fiscalYear,
  dept,
  position,
}: {
  year: number
  fiscalYear: number
  dept: string | null
  position: string | null
}) {
  const { data: fall } = useSuspenseQuery(fallYearQuery(year))
  const { data: budget } = useSuspenseQuery(budgetYearQuery(fiscalYear))
  const census = useMemo(
    () => toDepartmentCensus({ year, records: fall.records }, budget),
    [year, fall, budget],
  )
  const areas = useMemo(() => listAreas(budget.orgs), [budget])
  const place = useMemo(
    () => describePlace(dept, census, budget),
    [dept, census, budget],
  )
  const placed = useMemo(() => placeJobs(census, dept), [census, dept])
  const positionName =
    position === null ? null : positionLabel(placed, position)
  return { records: fall.records, areas, place, placed, positionName }
}

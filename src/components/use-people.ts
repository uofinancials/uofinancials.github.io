import { useLoaderData, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useCensusPlace } from '@/components/use-census-place'
import type { FallRecord } from '@/data/fall'
import {
  binsInRange,
  countNames,
  distinctValues,
  filterPeopleJobs,
  type GroupRow,
  groupSummary,
  type PeopleView,
  resolvePeopleView,
  sortJobs,
} from '@/lib/people-list'
import type { PeopleSearch } from '@/lib/people-search'
import { titleOf } from '@/lib/person-fields'
import { buildDistribution, type Distribution } from '@/lib/salary-distribution'

/** The view's filters alone, so turning a page or changing the sort or chart does not re-filter. */
function useFilterView(search: PeopleSearch, years: number[]): PeopleView {
  const { year, q, title, category, min, max } = search
  const { group, kind, term, dept, position } = search
  return useMemo(
    () =>
      resolvePeopleView(
        {
          year,
          q,
          title,
          category,
          min,
          max,
          group,
          kind,
          term,
          dept,
          position,
        },
        years,
      ),
    [
      year,
      q,
      title,
      category,
      min,
      max,
      group,
      kind,
      term,
      dept,
      position,
      years,
    ],
  )
}

export type Matching = {
  jobs: FallRecord[]
  sorted: FallRecord[]
  nameCount: number
  distribution: Distribution
  groups: GroupRow[]
}

function useMatching({
  placed,
  search,
  years,
  view,
}: {
  placed: FallRecord[]
  search: PeopleSearch
  years: number[]
  view: PeopleView
}): Matching {
  const filterView = useFilterView(search, years)
  const { sort, dir, year } = view
  const jobs = useMemo(
    () => filterPeopleJobs(placed, filterView),
    [placed, filterView],
  )
  const sorted = useMemo(
    () => sortJobs(jobs, { sort, dir, year }),
    [jobs, sort, dir, year],
  )
  const summary = useMemo(
    () => ({
      nameCount: countNames(jobs),
      distribution: binsInRange(buildDistribution(jobs, year), filterView),
      groups: groupSummary(jobs, year),
    }),
    [jobs, year, filterView],
  )
  return { jobs, sorted, ...summary }
}

/** The people list's view, its census's filter choices, and the jobs matching it. */
export function usePeople() {
  const { years, year, fiscalYear } = useLoaderData({ from: '/people' })
  const search = useSearch({ from: '/people' })
  const view = useMemo(() => resolvePeopleView(search, years), [search, years])
  const { records, areas, place, placed, positionName } = useCensusPlace({
    year,
    fiscalYear,
    dept: view.dept,
    position: view.position,
  })
  const matching = useMatching({ placed, search, years, view })
  const titles = useMemo(() => distinctValues(records, titleOf), [records])
  const categories = useMemo(
    () => distinctValues(records, (record) => record.eeoCategory),
    [records],
  )
  return {
    search,
    years,
    view,
    census: { areas, place, positionName, titles, categories },
    matching,
  }
}

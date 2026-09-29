import { useSuspenseQueries } from '@tanstack/react-query'
import { Link, useLoaderData, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { TrendsControls } from '@/components/trends/controls'
import { PayChangesSection } from '@/components/trends/pay-changes-section'
import { censusYearOf } from '@/data/fall'
import { fallYearQuery, toData } from '@/data/queries'
import { useDepartmentCensuses } from '@/hooks/use-department-censuses'
import { usePayChanges } from '@/hooks/use-pay-changes'
import { usePreloadedNavigate } from '@/hooks/use-preloaded-navigate'
import { areaTrendFilter } from '@/lib/departments/codes'
import { AREA_PLACEMENT_METHOD } from '@/lib/departments/jobs'
import { peerKeyFor } from '@/lib/people/peer-group'
import type { SectionSource } from '@/lib/shared/citation'
import { type PayChangesSearch, resolveTrendView } from '@/lib/trends/search'
import { filterNames, type TrendFilter } from '@/lib/trends/trends'

function usePayChangesView() {
  const { years, fiscalYears } = useLoaderData({ from: '/trends/pay-changes' })
  const search = useSearch({ from: '/trends/pay-changes' })
  const fallYears = useSuspenseQueries({
    queries: years.map(fallYearQuery),
    combine: toData,
  })
  const censuses = useMemo(
    () =>
      fallYears.map(({ censusDate, records }) => ({
        year: censusYearOf(censusDate),
        records,
      })),
    [fallYears],
  )
  const resolved = resolveTrendView(search, years)
  const position = useMemo(
    () =>
      resolved.position === null
        ? null
        : peerKeyFor(censuses, resolved.position),
    [censuses, resolved.position],
  )
  const view = { ...resolved, position }
  const { budgets, censuses: placed } = useDepartmentCensuses(
    fiscalYears,
    fallYears,
  )
  const area = useMemo(
    () =>
      view.area === null ? null : areaTrendFilter(view.area, placed, budgets),
    [view.area, placed, budgets],
  )
  const { kind, group, dept, from, to } = view
  const filter = useMemo(
    (): TrendFilter => ({
      kind,
      group,
      dept,
      position,
      jobs: area?.jobs ?? null,
      from,
      to,
    }),
    [kind, group, dept, position, area, from, to],
  )
  const names = useMemo(
    () => ({
      ...filterNames(censuses, { dept, position }),
      area: area?.name ?? null,
    }),
    [censuses, dept, position, area],
  )
  const changes = usePayChanges(fallYears, view, filter)
  return { years, view, names, changes, area }
}

/** Continuing jobs' changes in salary rate between census pairs, for a group, staff kind, department, area, or class or rank. */
export function PayChangesPage() {
  const navigate = usePreloadedNavigate()
  const { years, view, names, changes, area } = usePayChangesView()
  const filterSources: SectionSource[] = area
    ? [
        {
          kind: 'budget-range',
          ...area.fiscalYears,
          computed: AREA_PLACEMENT_METHOD,
        },
      ]
    : []
  const handleChange = (patch: PayChangesSearch) =>
    navigate({
      from: '/trends/pay-changes',
      to: '/trends/pay-changes',
      search: (previous) => ({ ...previous, ...patch }),
      resetScroll: false,
    })
  return (
    <div className="space-y-8">
      <PageHeader title="Pay changes of continuing jobs">
        <p className="text-sm">
          <Link className="link" to="/trends">
            All trends
          </Link>{' '}
          ·{' '}
          <Link className="link" to="/trends" search={{ tab: 'groups' }}>
            How groups are defined
          </Link>
        </p>
      </PageHeader>
      <TrendsControls
        view={view}
        years={years}
        lines={changes.series.map(({ key }) => key)}
        names={names}
        onChange={handleChange}
      />
      <PayChangesSection
        changes={changes}
        view={view}
        filterSources={filterSources}
        onChange={handleChange}
      />
    </div>
  )
}

import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useLoaderData, useSearch } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/page-header'
import { TrendsControls } from '@/components/trends/controls'
import { PayChangesSection } from '@/components/trends/pay-changes-section'
import { payChangesQuery } from '@/data/queries'
import { usePayChanges } from '@/hooks/use-pay-changes'
import { usePreloadedNavigate } from '@/hooks/use-preloaded-navigate'
import { AREA_PLACEMENT_METHOD } from '@/lib/departments/jobs'
import type { SectionSource } from '@/lib/shared/citation'
import { pairFilterNames } from '@/lib/trends/pair-file'
import { type PayChangesSearch, resolveTrendView } from '@/lib/trends/search'

/** Continuing jobs' changes in salary rate between census pairs, for a group, staff kind, department, area, or class or rank. */
export function PayChangesPage() {
  const navigate = usePreloadedNavigate()
  const { years, fiscalYears } = useLoaderData({ from: '/trends/pay-changes' })
  const view = resolveTrendView(
    useSearch({ from: '/trends/pay-changes' }),
    years,
  )
  const { data: file } = useSuspenseQuery(payChangesQuery)
  const changes = usePayChanges(view)
  const filterSources: SectionSource[] =
    view.area === null
      ? []
      : [
          {
            kind: 'budget-range',
            ...fiscalYears,
            computed: AREA_PLACEMENT_METHOD,
          },
        ]
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
        names={pairFilterNames(file, view)}
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

import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { PageSection } from '@/components/layout/page-section'
import { CompareSection } from '@/components/trends/compare-section'
import { GroupMapping } from '@/components/trends/group-mapping'
import { GrowthSection } from '@/components/trends/growth-section'
import { MoneySection } from '@/components/trends/money-section'
import { RaisesSection } from '@/components/trends/raises-section'
import { ReportFilters } from '@/components/trends/report-filters'
import { ReportTabs } from '@/components/trends/report-tabs'
import { SinceSection } from '@/components/trends/since-section'
import { SplitSection } from '@/components/trends/split-section'
import { areaTrendsQuery, summaryQuery, toData } from '@/data/queries'
import { AREA_PLACEMENT_METHOD } from '@/lib/departments/jobs'
import type { SectionSource } from '@/lib/shared/citation'
import { ALL_OF_UO } from '@/lib/trends/compare'
import { staffingRows } from '@/lib/trends/report'
import { reportScope } from '@/lib/trends/scope'
import {
  MEASURED_TABS,
  type ReportSearch,
  resolveReportView,
} from '@/lib/trends/search'
import { sliceTrends } from '@/lib/trends/trends'

/** The report's view, the scope its filters pick, and that scope's figures over the range. */
function useReport() {
  const { years, fiscalYears } = useLoaderData({ from: '/trends' })
  const search = useSearch({ from: '/trends' })
  const { data: summary } = useSuspenseQuery(summaryQuery)
  const view = resolveReportView(search, years)
  const area = summary.trends.areas.find(({ code }) => code === search.area)
  const [areaFile = null] = useSuspenseQueries({
    queries: (area ? [area.code] : []).map(areaTrendsQuery),
    combine: toData,
  })
  const scope = reportScope(
    { trends: summary.trends.all, payChanges: summary.trends.payChanges },
    areaFile,
    search.unit ?? null,
  )
  const trends = sliceTrends(scope.trends, view.from, view.to)
  const scopeSources: SectionSource[] = scope.area
    ? [
        {
          kind: 'budget-range',
          ...fiscalYears,
          computed: AREA_PLACEMENT_METHOD,
        },
      ]
    : []
  return {
    years,
    summary,
    view,
    scope,
    units: areaFile?.units ?? [],
    trends,
    ratios: staffingRows(trends),
    scopeSources,
    university: {
      code: '',
      name: ALL_OF_UO,
      points: summary.trends.all.total,
    },
    payChangesFilter: scope.unit
      ? { dept: scope.unit.code }
      : scope.area
        ? { area: scope.area.code }
        : {},
  }
}

function GroupsSection() {
  return (
    <PageSection title="How are groups defined?">
      <p className="text-sm text-muted-foreground">
        UO restructured its EEO categories in 2018, 2019, and 2021. This site
        groups them so each group means the same jobs in every year.
      </p>
      <GroupMapping />
    </PageSection>
  )
}

type Report = ReturnType<typeof useReport>

/** The picked tab's section. */
function TabPanel({
  report,
  onChange,
}: {
  report: Report
  onChange: (patch: ReportSearch) => void
}) {
  const { view } = report
  const range = { from: view.from, to: view.to }
  const common = {
    trends: report.trends,
    range,
    scopeSources: report.scopeSources,
  }
  switch (view.tab) {
    case 'grew':
      return (
        <GrowthSection
          {...common}
          ratios={report.ratios}
          metric={view.measure}
          view={view.view}
          onChange={onChange}
        />
      )
    case 'money':
      return <MoneySection {...common} />
    case 'pay':
      return <SplitSection {...common} />
    case 'raises':
      return (
        <RaisesSection
          payChanges={report.scope.payChanges}
          fromYears={view.fromYears}
          range={range}
          scope={report.payChangesFilter}
          scopeSources={report.scopeSources}
        />
      )
    case 'compare':
      return (
        <CompareSection
          areas={report.summary.trends.areas}
          university={report.university}
          scope={report.scope}
          units={report.units}
          metric={view.measure}
          range={range}
          scopeSources={report.scopeSources}
        />
      )
    case 'groups':
      return <GroupsSection />
  }
}

/** The trends report: one set of filters, the headline figures, and a tab for each question about the Fall censuses. */
export function TrendsPage() {
  const navigate = useNavigate({ from: '/trends' })
  const report = useReport()
  const { years, summary, view, scope, units, trends, ratios } = report
  const first = trends.total[0]
  const last = trends.total.at(-1)
  const handleChange = (patch: ReportSearch) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch }),
      resetScroll: false,
    })
  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-title">
          How University of Oregon jobs and pay have changed since Fall{' '}
          {view.from}
        </h1>
        <p className="text-muted-foreground">
          Jobs, pay, and salary spend from the Fall census salary reports UO
          publishes, grouped so each group means the same jobs in every year.
        </p>
      </div>
      <ReportFilters
        years={years}
        range={{ from: view.from, to: view.to }}
        areas={summary.trends.areas}
        area={scope.area?.code ?? null}
        units={units}
        unit={scope.unit?.code ?? null}
        measure={MEASURED_TABS.includes(view.tab) ? view.measure : null}
        onChange={handleChange}
      />
      {first && last && (
        <SinceSection
          scopeName={scope.name}
          first={first}
          last={last}
          ratios={{
            first: ratios[0]?.ratio ?? null,
            last: ratios.at(-1)?.ratio ?? null,
          }}
          scopeSources={report.scopeSources}
        />
      )}
      <div className="space-y-6">
        <ReportTabs tab={view.tab} />
        <TabPanel report={report} onChange={handleChange} />
      </div>
    </div>
  )
}

import { useSuspenseQuery } from '@tanstack/react-query'
import { useLoaderData } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SourceCitation } from '@/components/source-citation'
import { TotalsChart } from '@/components/totals-chart'
import { TotalsTable } from '@/components/totals-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { budgetYearQuery, fallYearQuery } from '@/data/queries'
import { formatCount, formatDollars, formatFte } from '@/lib/format'
import { buildCensusOverview, type CensusOverview } from '@/lib/overview'

const SPEND_METHOD =
  'salary spend is the published annual salary rate x FTE, summed over jobs; jobs on unpaid leave count as zero and classified temporaries are left out. It estimates annual pay; it is not payroll.'

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold tabular-nums">
        {value}
      </CardContent>
    </Card>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function AreaBases({ bases }: { bases: CensusOverview['areaBases'] }) {
  return (
    <p className="text-sm text-muted-foreground">
      Areas: {formatCount(bases.published)} jobs placed by UO's published budget
      hierarchy, {formatCount(bases.name)} by this site from their department's
      name, {formatCount(bases.hand)} by this site by hand, and{' '}
      {formatCount(bases.unassigned)} not assigned. UO does not publish the area
      of the other departments.
    </p>
  )
}

export function OverviewPage() {
  const { year, fiscalYear } = useLoaderData({ from: '/' })
  const { data: census } = useSuspenseQuery(fallYearQuery(year))
  const { data: budget } = useSuspenseQuery(budgetYearQuery(fiscalYear))
  const overview = buildCensusOverview(census.records, budget.orgs)
  const fall = { kind: 'fall', year } as const
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">
          University of Oregon employees, Fall {year}
        </h1>
        <div className="grid gap-4 sm:grid-cols-3">
          <Figure label="People" value={formatCount(overview.total.people)} />
          <Figure label="FTE" value={formatFte(overview.total.fteHundredths)} />
          <Figure
            label="Salary spend"
            value={formatDollars(overview.total.spendCents)}
          />
        </div>
        <SourceCitation
          source={fall}
          computed={`people are distinct published names as of the ${census.censusDate} census; FTE is each job's appointment percent, summed; ${SPEND_METHOD}`}
        />
      </div>
      <Section title="By EEO category">
        <TotalsChart
          groups={overview.byCategory}
          label="Salary spend by EEO category"
        />
        <TotalsTable
          groupLabel="EEO category"
          groups={overview.byCategory}
          totalSpendCents={overview.total.spendCents}
          temps={overview.temps}
        />
        <SourceCitation
          source={fall}
          computed={`a person with jobs in two categories counts in both, so people do not add up to the total; ${SPEND_METHOD}`}
        />
      </Section>
      <Section title="By college or VP area">
        <TotalsChart
          groups={overview.byArea}
          label="Salary spend by college or VP area"
        />
        <TotalsTable
          groupLabel="Area"
          groups={overview.byArea}
          totalSpendCents={overview.total.spendCents}
          temps={overview.temps}
        />
        <AreaBases bases={overview.areaBases} />
        <SourceCitation source={fall} computed={SPEND_METHOD} />
        <SourceCitation
          source={{ kind: 'budget', fiscalYear }}
          computed="the areas are the budget's level-3 organisations; each job is placed by its pay department."
        />
      </Section>
    </div>
  )
}

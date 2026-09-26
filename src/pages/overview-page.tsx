import { useSuspenseQuery } from '@tanstack/react-query'
import {
  Link,
  type LinkProps,
  useLoaderData,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { useMemo } from 'react'
import { AreaBreakdown } from '@/components/area-breakdown'
import { CitedLine } from '@/components/cited-line'
import { PageSection } from '@/components/page-section'
import { ScenarioAnswers } from '@/components/scenario-answers'
import { SeriesChart } from '@/components/series-chart'
import { SourceCitation } from '@/components/source-citation'
import { TopPaidTable } from '@/components/top-paid-table'
import { fiscalYearLabel } from '@/data/budget'
import type { Projection } from '@/data/outlook'
import {
  budgetYearQuery,
  fallYearQuery,
  manifestQuery,
  opeRatesQuery,
  outlookQuery,
} from '@/data/queries'
import { outlookSeries } from '@/lib/budget-outlook'
import { toDepartmentCensus } from '@/lib/department-jobs'
import { formatCompactDollars, formatCount, formatDollars } from '@/lib/format'
import {
  areaFigures,
  exampleAnswers,
  type HeadlineFigures,
  headlineFigures,
  jobsByCensus,
  topPaidJobs,
} from '@/lib/home'
import { fiscalYearOf, SPEND_METHOD } from '@/lib/overview'
import { MIN_JOBS_SHOWN } from '@/lib/trends'

const TOP_PAID_COUNT = 10
const COMPACT_CHART = 'h-64'

function useHomeData() {
  const { year, fiscalYear, censusDate } = useLoaderData({ from: '/' })
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const { data: fall } = useSuspenseQuery(fallYearQuery(year))
  const { data: budget } = useSuspenseQuery(budgetYearQuery(fiscalYear))
  const { data: outlook } = useSuspenseQuery(outlookQuery)
  const { data: rates } = useSuspenseQuery(opeRatesQuery)
  const [projection] = outlook.projections
  const censusFiscalYear = fiscalYearOf(censusDate)
  return useMemo(() => {
    const census = toDepartmentCensus({ year, records: fall.records }, budget)
    return {
      year,
      censusDate,
      budget,
      projection,
      headlines: headlineFigures({
        records: fall.records,
        budget,
        projection,
        censusFiscalYear,
      }),
      answers: exampleAnswers({
        census,
        budget,
        rates,
        projection,
        censusFiscalYear,
      }),
      areas: areaFigures(census, budget),
      topPaid: topPaidJobs(fall.records, TOP_PAID_COUNT),
      jobsByYear: jobsByCensus(manifest),
    }
  }, [
    year,
    censusDate,
    fall,
    budget,
    projection,
    rates,
    manifest,
    censusFiscalYear,
  ])
}

function Headline({
  label,
  value,
  to,
}: {
  label: string
  value: string
  to: LinkProps['to']
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border p-4 hover:bg-muted focus-visible:ring-2"
    >
      <span className="block text-sm text-muted-foreground">{label}</span>
      <span className="block text-2xl font-semibold tabular-nums">{value}</span>
    </Link>
  )
}

function Headlines({
  figures,
  year,
  fiscalYear,
}: {
  figures: HeadlineFigures
  year: number
  fiscalYear: number
}) {
  const { runRate } = figures
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Headline
        label={`${fiscalYearLabel(runRate.fiscalYear)} projected E&G run rate`}
        value={formatDollars(runRate.cents)}
        to="/budget"
      />
      <Headline
        label={`${fiscalYearLabel(fiscalYear)} budget, all funds`}
        value={formatDollars(figures.budgetCents)}
        to="/departments"
      />
      <Headline
        label={`Fall ${year} salary spend`}
        value={formatDollars(figures.spendCents)}
        to="/people"
      />
      <Headline
        label={`Fall ${year} people`}
        value={formatCount(figures.people)}
        to="/people"
      />
    </div>
  )
}

function GapSection({
  projection,
  runRate,
}: {
  projection: Projection
  runRate: HeadlineFigures['runRate']
}) {
  const { labels, series } = outlookSeries(projection)
  const lastYear = projection.fiscalYears.at(-1) ?? runRate.fiscalYear
  return (
    <PageSection title="The projected gap">
      <p>
        “{projection.title}” projects the E&G fund, the part of the budget
        funded mostly by tuition and state appropriation, to run at{' '}
        {formatDollars(runRate.cents)} in {fiscalYearLabel(runRate.fiscalYear)}{' '}
        and {formatDollars(projection.runRateCents.at(-1) ?? 0)} in{' '}
        {fiscalYearLabel(lastYear)}. The run rate is revenue less expenses, as
        published.{' '}
        <Link to="/budget" className="underline">
          See the budget outlook
        </Link>
        .
      </p>
      <SeriesChart
        labels={labels}
        series={series}
        format={formatDollars}
        formatAxis={formatCompactDollars}
        label="Projected E&G run rate and ending fund balance by fiscal year"
        className={COMPACT_CHART}
      />
      <CitedLine source={projection.source} />
    </PageSection>
  )
}

function JobsTrend({
  jobsByYear,
}: {
  jobsByYear: { year: number; jobs: number }[]
}) {
  const first = jobsByYear.at(0)
  const last = jobsByYear.at(-1)
  if (!first || !last) return null
  return (
    <PageSection title="Jobs over time">
      <p>
        The Fall census published {formatCount(first.jobs)} job records in{' '}
        {first.year} and {formatCount(last.jobs)} in {last.year}.{' '}
        <Link to="/trends" className="underline">
          See trends by group
        </Link>
        .
      </p>
      <SeriesChart
        labels={jobsByYear.map(({ year }) => String(year))}
        series={[
          { key: 'Job records', values: jobsByYear.map(({ jobs }) => jobs) },
        ]}
        format={formatCount}
        formatAxis={formatCount}
        label={`Job records published per Fall census, ${first.year}-${last.year}`}
        className={COMPACT_CHART}
      />
      <SourceCitation
        source={{ kind: 'fall-range', from: first.year, to: last.year }}
        computed="each census's job records, as counted in its published files; a person with two jobs counts twice."
      />
    </PageSection>
  )
}

function AreaBases({
  bases,
}: {
  bases: ReturnType<typeof areaFigures>['bases']
}) {
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

function DepartmentsPreview({
  data,
}: {
  data: ReturnType<typeof useHomeData>
}) {
  const { measure = 'budget' } = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const { year, budget } = data
  const fiscal = fiscalYearLabel(budget.fiscalYear)
  return (
    <PageSection title="Largest colleges and VP areas">
      <AreaBreakdown
        areas={data.areas.areas}
        measure={measure}
        labels={{
          budget: `${fiscal} budget`,
          spend: `Fall ${year} salary spend`,
          jobs: `Fall ${year} jobs`,
        }}
        onMeasure={(chosen) =>
          navigate({ search: { measure: chosen }, replace: true })
        }
      />
      <p>
        <Link to="/departments" className="underline">
          See every area, unit, and pay department
        </Link>
      </p>
      <AreaBases bases={data.areas.bases} />
      <SourceCitation
        source={{ kind: 'budget', fiscalYear: budget.fiscalYear }}
        computed="an area's budget is the Total Expenditure Budget summed over its units, as on the departments page."
      />
      <SourceCitation
        source={{ kind: 'fall', year }}
        computed={`an area's jobs are the census jobs placed in it; ${SPEND_METHOD} Spend is blank for fewer than ${MIN_JOBS_SHOWN} paid jobs.`}
      />
    </PageSection>
  )
}

function PeoplePreview({ data }: { data: ReturnType<typeof useHomeData> }) {
  const { year } = data
  return (
    <PageSection title="Highest salary rates">
      <p>
        The {TOP_PAID_COUNT} highest published annual salary rates in the Fall{' '}
        {year} census, one row per job as published; classified temporaries are
        left out.{' '}
        <Link
          to="/people"
          search={{ sort: 'rate', dir: 'desc' }}
          className="underline"
        >
          See every job by rate
        </Link>
        .
      </p>
      <TopPaidTable jobs={data.topPaid} year={year} />
      <SourceCitation source={{ kind: 'fall', year }} />
    </PageSection>
  )
}

function Freshness({ data }: { data: ReturnType<typeof useHomeData> }) {
  const { budget, projection } = data
  return (
    <p className="text-sm text-muted-foreground">
      Data as of the Fall {data.year} census of {data.censusDate}, the{' '}
      {fiscalYearLabel(budget.fiscalYear)} budget at period {budget.period}, and
      “{projection.title}” in the {projection.source.document}.{' '}
      <Link to="/sources" className="underline">
        Every source and when it was retrieved
      </Link>
      .
    </p>
  )
}

export function OverviewPage() {
  const data = useHomeData()
  const { year, budget, headlines, projection } = data
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">UO Financials</h1>
        <p>
          An independent look at the salary, headcount, and budget data the
          University of Oregon publishes: see the projected budget gap, test
          what pay rules would save, follow jobs and pay over twelve years, and
          look up a department or a person.
        </p>
        <Headlines
          figures={headlines}
          year={year}
          fiscalYear={budget.fiscalYear}
        />
        <div className="space-y-1">
          <CitedLine source={projection.source} />
          <SourceCitation
            source={{ kind: 'budget', fiscalYear: budget.fiscalYear }}
            computed="the budget is the Total Expenditure Budget summed over every published line, all funds."
          />
          <SourceCitation
            source={{ kind: 'fall', year }}
            computed={`people are distinct published names; ${SPEND_METHOD}`}
          />
        </div>
      </div>
      <GapSection projection={projection} runRate={headlines.runRate} />
      <ScenarioAnswers
        answers={data.answers}
        year={year}
        fiscalYear={budget.fiscalYear}
        projection={projection}
      />
      <JobsTrend jobsByYear={data.jobsByYear} />
      <DepartmentsPreview data={data} />
      <PeoplePreview data={data} />
      <Freshness data={data} />
    </div>
  )
}

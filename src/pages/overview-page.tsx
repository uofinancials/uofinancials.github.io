import { useSuspenseQuery } from '@tanstack/react-query'
import {
  Link,
  type LinkProps,
  useNavigate,
  useSearch,
} from '@tanstack/react-router'
import { SeriesChart } from '@/components/charts/series-chart'
import { AreaBreakdown } from '@/components/home/area-breakdown'
import { ScenarioAnswers } from '@/components/home/scenario-answers'
import { TopPaidTable } from '@/components/home/top-paid-table'
import { PageHeader } from '@/components/layout/page-header'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { StatCard } from '@/components/layout/stat-card'
import { fiscalYearLabel } from '@/data/budget'
import type { Projection } from '@/data/outlook'
import {
  homeQuery,
  manifestQuery,
  outlookQuery,
  raiseTermsQuery,
} from '@/data/queries'
import { fundBalanceMarker, outlookSeries } from '@/lib/budget/outlook'
import { fiscalYearOf, SPEND_METHOD } from '@/lib/census/totals'
import { sizeLabels } from '@/lib/departments/measures'
import {
  answersOf,
  type HeadlineFigures,
  jobsByCensus,
  type placementBases,
  TOP_PAID_COUNT,
} from '@/lib/home/home'
import { firstSavingsYear } from '@/lib/scenario/outlook'
import { raiseRates, raiseSources } from '@/lib/scenario/raises'
import { scenarioTempsSources } from '@/lib/scenario/scenario'
import {
  formatCompactDollars,
  formatCount,
  formatDollars,
  formatRoundedDollars,
} from '@/lib/shared/format'
import { fyPaySource, fyPayYears, MIN_JOBS_SHOWN } from '@/lib/trends/trends'

const COMPACT_CHART = 'h-64'

function useHomeData() {
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const { data: home } = useSuspenseQuery(homeQuery)
  const { data: outlook } = useSuspenseQuery(outlookQuery)
  const { data: raiseTerms } = useSuspenseQuery(raiseTermsQuery)
  const [projection] = outlook.projections
  const firstYearRaises = raiseRates(
    raiseTerms.terms,
    firstSavingsYear(projection.fiscalYears, fiscalYearOf(home.censusDate)),
  )
  const fyYears = fyPayYears(manifest, [home.year])
  return {
    ...home,
    projection,
    answers: answersOf(home.answers),
    raiseSources: raiseSources(firstYearRaises),
    jobsByYear: jobsByCensus(manifest),
    fySources: fyPaySource(fyYears),
    tempsSources: scenarioTempsSources(fyYears),
  }
}

function DollarCard({
  label,
  cents,
  to,
}: {
  label: string
  cents: number
  to: LinkProps['to']
}) {
  return (
    <StatCard label={label} value={formatRoundedDollars(cents)} to={to}>
      <span className="block text-sm text-muted-foreground tabular-nums">
        {formatDollars(cents)}
      </span>
    </StatCard>
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
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <DollarCard
        label={`${fiscalYearLabel(runRate.fiscalYear)} projected E&G run rate`}
        cents={runRate.cents}
        to="/budget"
      />
      <DollarCard
        label={`${fiscalYearLabel(fiscalYear)} budget, all funds`}
        cents={figures.budgetCents}
        to="/departments"
      />
      <DollarCard
        label={`Fall ${year} salary spend`}
        cents={figures.spendCents}
        to="/people"
      />
      <StatCard
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
        <Link to="/budget" className="link">
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
        marker={fundBalanceMarker(projection)}
        className={COMPACT_CHART}
      />
      <Sources sources={[{ kind: 'document', source: projection.source }]} />
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
        <Link to="/trends" className="link">
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
      <Sources
        sources={[
          {
            kind: 'fall-range',
            from: first.year,
            to: last.year,
            computed:
              "each census's job records, as counted in its published files; a person with two jobs counts twice.",
          },
        ]}
      />
    </PageSection>
  )
}

function AreaBases({ bases }: { bases: ReturnType<typeof placementBases> }) {
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
  const { year, fiscalYear } = data
  return (
    <PageSection title="Largest colleges and VP areas">
      <AreaBreakdown
        areas={data.areas}
        measure={measure}
        labels={sizeLabels(data)}
        onMeasure={(chosen) =>
          navigate({
            search: { measure: chosen },
            replace: true,
            resetScroll: false,
          })
        }
      />
      <p>
        <Link to="/departments" className="link">
          See every area, unit, and pay department
        </Link>
      </p>
      <AreaBases bases={data.bases} />
      <Sources
        sources={[
          {
            kind: 'budget',
            fiscalYear,
            computed:
              "an area's budget is the Total Expenditure Budget summed over its units, as on the departments page.",
          },
          {
            kind: 'fall',
            year,
            computed: `an area's jobs are the census jobs placed in it; ${SPEND_METHOD} Spend is blank for fewer than ${MIN_JOBS_SHOWN} paid jobs.`,
          },
          ...data.fySources,
        ]}
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
        {year} census, one row per job as published.{' '}
        <Link
          to="/people"
          search={{ sort: 'rate', dir: 'desc' }}
          className="link"
        >
          See every job by rate
        </Link>
        .
      </p>
      <TopPaidTable jobs={data.topPaid} year={year} />
      <Sources sources={[{ kind: 'fall', year }]} />
    </PageSection>
  )
}

function Freshness({ data }: { data: ReturnType<typeof useHomeData> }) {
  const { fiscalYear, period, projection } = data
  return (
    <p className="text-sm text-muted-foreground">
      Data as of the Fall {data.year} census of {data.censusDate}, the{' '}
      {fiscalYearLabel(fiscalYear)} budget at period {period}, and “
      {projection.title}” in the {projection.source.document}.{' '}
      <Link to="/sources" className="link">
        Every source and when it was retrieved
      </Link>
      .
    </p>
  )
}

export function OverviewPage() {
  const data = useHomeData()
  const { year, fiscalYear, headlines, projection } = data
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PageHeader title="UO Financials" tabTitle={null}>
          <p>
            An independent look at the salary, headcount, and budget data the
            University of Oregon publishes: see the projected budget gap, test
            what pay rules would save, follow jobs and pay over twelve years,
            and look up a department or a person.
          </p>
        </PageHeader>
        <Headlines figures={headlines} year={year} fiscalYear={fiscalYear} />
        <Sources
          sources={[
            { kind: 'document', source: projection.source },
            {
              kind: 'budget',
              fiscalYear,
              computed:
                'the budget is the Total Expenditure Budget summed over every published line, all funds.',
            },
            {
              kind: 'fall',
              year,
              computed: `people are distinct published names; ${SPEND_METHOD}`,
            },
            ...data.fySources,
          ]}
        />
      </div>
      <GapSection projection={projection} runRate={headlines.runRate} />
      <ScenarioAnswers
        answers={data.answers}
        year={year}
        fiscalYear={fiscalYear}
        projection={projection}
        raiseSources={data.raiseSources}
        tempsSources={data.tempsSources}
      />
      <JobsTrend jobsByYear={data.jobsByYear} />
      <DepartmentsPreview data={data} />
      <PeoplePreview data={data} />
      <Freshness data={data} />
    </div>
  )
}

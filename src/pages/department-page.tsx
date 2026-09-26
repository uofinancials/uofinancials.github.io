import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import {
  Link,
  useLoaderData,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router'
import { useMemo } from 'react'
import { DepartmentBudgetSection } from '@/components/department-budget-section'
import { DepartmentJobsSection } from '@/components/department-jobs-section'
import { DepartmentTable } from '@/components/department-table'
import { SourceCitation } from '@/components/source-citation'
import { type BudgetYear, fiscalYearLabel } from '@/data/budget'
import { budgetYearQuery, fallYearQuery, manifestQuery } from '@/data/queries'
import { departmentBudget } from '@/lib/department-budget'
import { type CodeProfile, describeCode } from '@/lib/department-index'
import {
  type DepartmentCensus,
  departmentClasses,
  departmentTrends,
  departmentYears,
  toDepartmentCensuses,
} from '@/lib/department-jobs'
import {
  type DepartmentSearch,
  type DepartmentView,
  resolveDepartmentView,
} from '@/lib/department-search'
import {
  DEPARTMENT_TABLE_METHOD,
  departmentRows,
  latestTableYears,
  sortRows,
} from '@/lib/department-table'
import { NotFoundPage } from '@/pages/not-found-page'

const SPONSORED_NOTE =
  'The budget excludes sponsored research funds, so a unit’s budgeted salaries can fall well short of its jobs’ salary spend.'

function toData<T>(results: { data: T }[]): T[] {
  return results.map(({ data }) => data)
}

function useDepartmentData() {
  const { fiscalYears, fallYears, eliminationFiscalYear } = useLoaderData({
    from: '/departments/$code',
  })
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const budgets = useSuspenseQueries({
    queries: fiscalYears.map(budgetYearQuery),
    combine: toData,
  })
  const falls = useSuspenseQueries({
    queries: fallYears.map(fallYearQuery),
    combine: toData,
  })
  const censuses = useMemo(
    () => toDepartmentCensuses(manifest, falls, budgets),
    [manifest, falls, budgets],
  )
  const eliminationOrgs = budgets.find(
    ({ fiscalYear }) => fiscalYear === eliminationFiscalYear,
  )?.orgs
  return { budgets, censuses, eliminationOrgs }
}

function DepartmentLinks({
  code,
  canEliminate,
  hasPayChanges,
}: {
  code: string
  canEliminate: boolean
  hasPayChanges: boolean
}) {
  if (!canEliminate && !hasPayChanges) return null
  return (
    <p className="flex flex-wrap gap-x-4 text-sm">
      {canEliminate && (
        <Link
          className="underline"
          to="/scenarios"
          search={{ rules: [{ kind: 'eliminate', code }] }}
        >
          Eliminate in a scenario
        </Link>
      )}
      {hasPayChanges && (
        <Link
          className="underline"
          to="/trends"
          search={{ dept: code, metric: 'change' }}
        >
          Pay changes
        </Link>
      )}
    </p>
  )
}

function AreaUnitsSection({
  code,
  censuses,
  budgets,
  view,
  onChange,
}: {
  code: string
  censuses: DepartmentCensus[]
  budgets: BudgetYear[]
  view: DepartmentView
  onChange: (patch: DepartmentSearch) => void
}) {
  const table = useMemo(() => {
    const years = latestTableYears(censuses, budgets)
    if (!years) return null
    const units = departmentRows(years.now, years.before).units
    return { ...years, rows: units.filter((row) => row.area?.code === code) }
  }, [code, censuses, budgets])
  if (!table || table.rows.length === 0) return null
  const { now, before } = table
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Units in this area</h2>
      <DepartmentTable
        caption={`${fiscalYearLabel(now.budget.fiscalYear)} budget and Fall ${now.census.year} jobs, with changes from ${fiscalYearLabel(before.budget.fiscalYear)} and Fall ${before.census.year}`}
        rows={sortRows(table.rows, view.sort, view.dir)}
        showArea={false}
        view={view}
        onSort={(sort, dir) => onChange({ sort, dir })}
      />
      <SourceCitation
        source={{
          kind: 'budget-range',
          from: before.budget.fiscalYear,
          to: now.budget.fiscalYear,
        }}
        computed={DEPARTMENT_TABLE_METHOD}
      />
      <SourceCitation
        source={{
          kind: 'fall-range',
          from: before.census.year,
          to: now.census.year,
        }}
      />
    </section>
  )
}

function DepartmentHeader({
  profile,
  hasBothSources,
  links,
}: {
  profile: CodeProfile
  hasBothSources: boolean
  links: { canEliminate: boolean; hasPayChanges: boolean }
}) {
  return (
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold">
        {profile.name}{' '}
        <span className="text-muted-foreground">{profile.code}</span>
      </h1>
      <p className="text-sm text-muted-foreground">
        {profile.isArea ? 'College or VP area' : 'Department'}
        {profile.area && (
          <>
            {' in '}
            <Link
              className="underline"
              to="/departments/$code"
              params={{ code: profile.area.code }}
            >
              {profile.area.name}
            </Link>
          </>
        )}
        .{' '}
        <Link className="underline" to="/departments">
          All departments
        </Link>
      </p>
      {profile.otherNames.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Also published as {profile.otherNames.join('; ')}.
        </p>
      )}
      {hasBothSources && (
        <p className="text-sm text-muted-foreground">{SPONSORED_NOTE}</p>
      )}
      <DepartmentLinks code={profile.code} {...links} />
    </header>
  )
}

/** The code's profile, jobs, and budget, and the views the search asks for. */
function useDepartmentView(
  code: string,
  {
    budgets,
    censuses,
  }: Pick<ReturnType<typeof useDepartmentData>, 'budgets' | 'censuses'>,
) {
  const search = useSearch({ from: '/departments/$code' })
  const profile = useMemo(
    () => describeCode(code, censuses, budgets),
    [code, censuses, budgets],
  )
  const jobs = useMemo(() => departmentYears(code, censuses), [code, censuses])
  const view = resolveDepartmentView(search, jobs.yearsWithJobs)
  const budget = useMemo(
    () => departmentBudget(code, budgets, view.budget),
    [code, budgets, view.budget],
  )
  const { kind, year } = view
  const trends = useMemo(() => departmentTrends(jobs, kind), [jobs, kind])
  const classRows = useMemo(
    () => departmentClasses(jobs, { kind, year }),
    [jobs, kind, year],
  )
  return { profile, jobs, view, budget, trends, classRows }
}

export function DepartmentPage() {
  const { code } = useParams({ from: '/departments/$code' })
  const navigate = useNavigate({ from: '/departments/$code' })
  const data = useDepartmentData()
  const { budgets, censuses, eliminationOrgs } = data
  const { profile, jobs, view, budget, trends, classRows } = useDepartmentView(
    code,
    data,
  )
  if (!profile) return <NotFoundPage />
  const hasJobs = jobs.yearsWithJobs.length > 0
  const handleChange = (patch: DepartmentSearch) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }) })
  return (
    <div className="space-y-8">
      <DepartmentHeader
        profile={profile}
        hasBothSources={profile.hasBudget && hasJobs}
        links={{
          canEliminate: eliminationOrgs?.[code] !== undefined,
          hasPayChanges: !profile.isArea && hasJobs,
        }}
      />
      {profile.hasBudget ? (
        <DepartmentBudgetSection
          budget={budget}
          breakdown={view.budget}
          onBreakdown={(breakdown) => handleChange({ budget: breakdown })}
        />
      ) : (
        <p>
          UO’s budget publishes no unit or area with code {code}; its jobs are
          budgeted under a unit this page cannot identify.
        </p>
      )}
      {profile.isArea && (
        <AreaUnitsSection
          code={code}
          censuses={censuses}
          budgets={budgets}
          view={view}
          onChange={handleChange}
        />
      )}
      {hasJobs ? (
        <DepartmentJobsSection
          code={code}
          trends={trends}
          classRows={classRows}
          placements={jobs.placements}
          view={view}
          yearsWithJobs={jobs.yearsWithJobs}
          onChange={handleChange}
        />
      ) : (
        <p>No Fall census lists a job paid under code {code}.</p>
      )}
    </div>
  )
}

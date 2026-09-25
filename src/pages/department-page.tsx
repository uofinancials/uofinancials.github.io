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
import type { BudgetYear } from '@/data/budget'
import { censusYearOf, type FallYear } from '@/data/fall'
import { budgetYearQuery, fallYearQuery, manifestQuery } from '@/data/queries'
import { departmentBudget } from '@/lib/department-budget'
import { type CodeProfile, describeCode } from '@/lib/department-index'
import {
  type DepartmentCensus,
  departmentJobFigures,
  departmentYears,
} from '@/lib/department-jobs'
import {
  type DepartmentSearch,
  resolveDepartmentView,
} from '@/lib/department-search'
import { fiscalYearForCensus } from '@/lib/overview'
import { NotFoundPage } from '@/pages/not-found-page'

const SPONSORED_NOTE =
  'The budget excludes sponsored research funds, so a unit’s budgeted salaries can fall well short of its jobs’ salary spend.'

function toBudgets(results: { data: BudgetYear }[]) {
  return results.map(({ data }) => data)
}

function toFallYears(results: { data: FallYear }[]) {
  return results.map(({ data }) => data)
}

function useDepartmentData() {
  const { fiscalYears, fallYears } = useLoaderData({
    from: '/departments/$code',
  })
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const budgets = useSuspenseQueries({
    queries: fiscalYears.map(budgetYearQuery),
    combine: toBudgets,
  })
  const falls = useSuspenseQueries({
    queries: fallYears.map(fallYearQuery),
    combine: toFallYears,
  })
  const censuses = useMemo(
    () =>
      falls.map(({ censusDate, records }): DepartmentCensus => {
        const year = censusYearOf(censusDate)
        const fiscalYear = fiscalYearForCensus(manifest, censusDate)
        const orgs =
          budgets.find((budget) => budget.fiscalYear === fiscalYear)?.orgs ?? {}
        return { year, records, fiscalYear, orgs }
      }),
    [falls, budgets, manifest],
  )
  return { budgets, censuses }
}

function DepartmentHeader({
  profile,
  hasBothSources,
}: {
  profile: CodeProfile
  hasBothSources: boolean
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
    </header>
  )
}

export function DepartmentPage() {
  const { code } = useParams({ from: '/departments/$code' })
  const search = useSearch({ from: '/departments/$code' })
  const navigate = useNavigate({ from: '/departments/$code' })
  const { budgets, censuses } = useDepartmentData()
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
  const figures = useMemo(
    () => departmentJobFigures(jobs, { kind, year }),
    [jobs, kind, year],
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
      {hasJobs ? (
        <DepartmentJobsSection
          trends={figures.trends}
          classRows={figures.classRows}
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

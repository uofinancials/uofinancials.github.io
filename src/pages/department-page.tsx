import { useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import {
  Link,
  useLoaderData,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router'
import { useMemo } from 'react'
import { DepartmentBudgetSection } from '@/components/departments/budget-section'
import { DepartmentJobsSection } from '@/components/departments/jobs-section'
import { DepartmentTable } from '@/components/departments/table'
import { PageHeader } from '@/components/layout/page-header'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { type BudgetYear, fiscalYearLabel } from '@/data/budget'
import type { FyTemps } from '@/data/fy-temps'
import { fallYearQuery, fyTempsQuery, toData } from '@/data/queries'
import { useDepartmentCensuses } from '@/hooks/use-department-censuses'
import { departmentBudget } from '@/lib/departments/budget'
import { type CodeProfile, describeCode } from '@/lib/departments/codes'
import {
  type DepartmentCensus,
  departmentClasses,
  departmentTrends,
  departmentYears,
} from '@/lib/departments/jobs'
import {
  type DepartmentSearch,
  type DepartmentView,
  resolveDepartmentView,
} from '@/lib/departments/search'
import {
  DEPARTMENT_TABLE_METHOD,
  departmentRows,
  latestTableYears,
  sortRows,
} from '@/lib/departments/table'
import { tabTitleOf } from '@/lib/shared/format'
import { fyPaySource } from '@/lib/trends/trends'
import { NotFoundPage } from '@/pages/not-found-page'

const SPONSORED_NOTE =
  'The budget excludes sponsored research funds, so a unit’s budgeted salaries can fall well short of its jobs’ salary spend.'

type DepartmentData = {
  budgets: BudgetYear[]
  censuses: DepartmentCensus[]
  fyTemps: FyTemps
}

function useDepartmentData() {
  const { fiscalYears, fallYears, eliminationFiscalYear } = useLoaderData({
    from: '/departments/$code',
  })
  const falls = useSuspenseQueries({
    queries: fallYears.map(fallYearQuery),
    combine: toData,
  })
  const { data: fyTemps } = useSuspenseQuery(fyTempsQuery)
  const { budgets, censuses } = useDepartmentCensuses(fiscalYears, falls)
  const eliminationOrgs = budgets.find(
    ({ fiscalYear }) => fiscalYear === eliminationFiscalYear,
  )?.orgs
  return { budgets, censuses, eliminationOrgs, fyTemps }
}

function DepartmentLinks({
  code,
  isArea,
  canEliminate,
  hasPayChanges,
}: {
  code: string
  isArea: boolean
  canEliminate: boolean
  hasPayChanges: boolean
}) {
  if (!canEliminate && !hasPayChanges) return null
  return (
    <p className="flex flex-wrap gap-x-4 text-sm">
      {canEliminate && (
        <Link
          className="link"
          to="/scenarios"
          search={{ rules: [{ kind: 'eliminate', code }] }}
        >
          Eliminate in a scenario
        </Link>
      )}
      {hasPayChanges && (
        <Link
          className="link"
          to="/trends/pay-changes"
          search={isArea ? { area: code } : { dept: code }}
        >
          Pay changes
        </Link>
      )}
    </p>
  )
}

function AreaUnitsSection({
  code,
  data: { censuses, budgets, fyTemps },
  view,
  onChange,
}: {
  code: string
  data: DepartmentData
  view: DepartmentView
  onChange: (patch: DepartmentSearch) => void
}) {
  const table = useMemo(() => {
    const years = latestTableYears(censuses, budgets)
    return (
      years && {
        ...years,
        units: departmentRows(years.now, years.before, fyTemps).units,
      }
    )
  }, [censuses, budgets, fyTemps])
  const rows = useMemo(
    () => table?.units.filter((row) => row.area?.code === code) ?? [],
    [table, code],
  )
  if (!table || rows.length === 0) return null
  const { now, before } = table
  return (
    <PageSection title="Units in this area">
      <DepartmentTable
        caption={`${fiscalYearLabel(now.budget.fiscalYear)} budget and Fall ${now.census.year} jobs, with changes from ${fiscalYearLabel(before.budget.fiscalYear)} and Fall ${before.census.year}`}
        rows={sortRows(rows, view.sort, view.dir)}
        showArea={false}
        view={view}
        onSort={(sort, dir) => onChange({ sort, dir })}
      />
      <Sources
        sources={[
          {
            kind: 'budget-range',
            from: before.budget.fiscalYear,
            to: now.budget.fiscalYear,
            computed: DEPARTMENT_TABLE_METHOD,
          },
          {
            kind: 'fall-range',
            from: before.census.year,
            to: now.census.year,
          },
          ...fyPaySource(
            fyTemps.years
              .filter(({ censusYear }) =>
                [before.census.year, now.census.year].includes(censusYear),
              )
              .map(({ fiscalYear }) => fiscalYear),
          ),
        ]}
      />
    </PageSection>
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
    <PageHeader
      tabTitle={tabTitleOf(`${profile.name} ${profile.code}`)}
      title={
        <>
          {profile.name}{' '}
          <span className="text-muted-foreground">{profile.code}</span>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        {profile.isArea ? 'College or VP area' : 'Department'}
        {profile.area && (
          <>
            {' in '}
            <Link
              className="link"
              to="/departments/$code"
              params={{ code: profile.area.code }}
            >
              {profile.area.name}
            </Link>
          </>
        )}
        .{' '}
        <Link className="link" to="/departments">
          All departments
        </Link>
      </p>
      {profile.otherNames.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Also published as {profile.otherNames.join('; ')}.
        </p>
      )}
      {profile.aliasCodes.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Jobs the census pays under{' '}
          {profile.aliasCodes.length === 1 ? 'code' : 'codes'}{' '}
          {profile.aliasCodes.join(', ')} are counted here; this site joins the
          codes by hand.
        </p>
      )}
      {hasBothSources && (
        <p className="text-sm text-muted-foreground">{SPONSORED_NOTE}</p>
      )}
      <DepartmentLinks code={profile.code} isArea={profile.isArea} {...links} />
    </PageHeader>
  )
}

function useDepartmentView(
  code: string,
  { budgets, censuses, fyTemps }: DepartmentData,
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
  const trends = useMemo(
    () => departmentTrends(jobs, kind, fyTemps),
    [jobs, kind, fyTemps],
  )
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
  const { profile, jobs, view, budget, trends, classRows } = useDepartmentView(
    code,
    data,
  )
  if (!profile) return <NotFoundPage />
  const hasJobs = jobs.yearsWithJobs.length > 0
  const handleChange = (patch: DepartmentSearch) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch }),
      resetScroll: false,
    })
  return (
    <div className="space-y-8">
      <DepartmentHeader
        profile={profile}
        hasBothSources={profile.hasBudget && hasJobs}
        links={{
          canEliminate: data.eliminationOrgs?.[code] !== undefined,
          hasPayChanges: hasJobs,
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
          data={data}
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

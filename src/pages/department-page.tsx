import { useSuspenseQuery } from '@tanstack/react-query'
import {
  Link,
  useLoaderData,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router'
import { DepartmentBudgetSection } from '@/components/departments/budget-section'
import { DepartmentJobsSection } from '@/components/departments/jobs-section'
import { DepartmentTable } from '@/components/departments/table'
import { PageHeader } from '@/components/layout/page-header'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { fiscalYearLabel } from '@/data/budget'
import type { DepartmentFile } from '@/data/department'
import {
  departmentQuery,
  departmentsQuery,
  manifestQuery,
} from '@/data/queries'
import { isBudgetedIn } from '@/lib/departments/budget'
import {
  type DepartmentSearch,
  type DepartmentView,
  resolveDepartmentView,
  shownClasses,
} from '@/lib/departments/search'
import { DEPARTMENT_TABLE_METHOD, sortRows } from '@/lib/departments/table'
import { tabTitleOf } from '@/lib/shared/format'
import { fyPaySource, fyPayYears } from '@/lib/trends/trends'

const SPONSORED_NOTE =
  'The budget excludes sponsored research funds, so a unit’s budgeted salaries can fall well short of its jobs’ salary spend.'

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
  view,
  onChange,
}: {
  code: string
  view: DepartmentView
  onChange: (patch: DepartmentSearch) => void
}) {
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const {
    data: { now, before, rows: table },
  } = useSuspenseQuery(departmentsQuery)
  const rows = table.units.filter((row) => row.area?.code === code)
  if (rows.length === 0) return null
  return (
    <PageSection title="Units in this area">
      <DepartmentTable
        caption={`${fiscalYearLabel(now.fiscalYear)} budget and Fall ${now.year} jobs, with changes from ${fiscalYearLabel(before.fiscalYear)} and Fall ${before.year}`}
        rows={sortRows(rows, view.sort, view.dir)}
        showArea={false}
        view={view}
        onSort={(sort, dir) => onChange({ sort, dir })}
      />
      <Sources
        sources={[
          {
            kind: 'budget-range',
            from: before.fiscalYear,
            to: now.fiscalYear,
            computed: DEPARTMENT_TABLE_METHOD,
          },
          { kind: 'fall-range', from: before.year, to: now.year },
          ...fyPaySource(fyPayYears(manifest, [before.year, now.year])),
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
  profile: DepartmentFile['profile']
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

export function DepartmentPage() {
  const { code } = useParams({ from: '/departments/$code' })
  const { eliminationFiscalYear } = useLoaderData({
    from: '/departments/$code',
  })
  const search = useSearch({ from: '/departments/$code' })
  const navigate = useNavigate({ from: '/departments/$code' })
  const { data: file } = useSuspenseQuery(departmentQuery(code))
  const { profile, budget, yearsWithJobs } = file
  const view = resolveDepartmentView(search, yearsWithJobs)
  const hasJobs = yearsWithJobs.length > 0
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
          canEliminate: isBudgetedIn(budget, eliminationFiscalYear),
          hasPayChanges: hasJobs,
        }}
      />
      {budget ? (
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
        <AreaUnitsSection code={code} view={view} onChange={handleChange} />
      )}
      {hasJobs ? (
        <DepartmentJobsSection
          code={code}
          trends={file.trends[view.kind]}
          classRows={shownClasses(file.classes, view)}
          placements={file.placements}
          view={view}
          yearsWithJobs={yearsWithJobs}
          onChange={handleChange}
        />
      ) : (
        <p>No Fall census lists a job paid under code {code}.</p>
      )}
    </div>
  )
}

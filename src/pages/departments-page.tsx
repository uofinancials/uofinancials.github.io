import { useSuspenseQuery } from '@tanstack/react-query'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { DepartmentTable } from '@/components/department-table'
import { RadioField } from '@/components/radio-field'
import { SearchField } from '@/components/search-field'
import { SelectField } from '@/components/select-field'
import { SourceCitation } from '@/components/source-citation'
import { type BudgetYear, fiscalYearLabel } from '@/data/budget'
import { budgetYearQuery, fallYearQuery } from '@/data/queries'
import { listAreas } from '@/lib/areas'
import { toDepartmentCensus } from '@/lib/department-jobs'
import {
  type DepartmentsSearch,
  type DepartmentsView,
  resolveDepartmentsView,
} from '@/lib/department-search'
import {
  DEPARTMENT_TABLE_METHOD,
  departmentRows,
  filterRows,
  sortRows,
} from '@/lib/department-table'

const PLACEMENT_NOTE =
  'Areas and units are the budget’s level-3 and level-5 organisations. Pay departments the budget does not publish are placed in an area by a department-name prefix, or by hand, as on the overview.'
const LEVEL_OPTIONS = [
  ['areas', 'Colleges and VP areas'],
  ['units', 'Units and pay departments'],
] as const
const ALL_AREAS = ''

function useTableYear({
  year,
  fiscalYear,
}: {
  year: number
  fiscalYear: number
}) {
  const { data: fall } = useSuspenseQuery(fallYearQuery(year))
  const { data: budget } = useSuspenseQuery(budgetYearQuery(fiscalYear))
  return useMemo(
    () => ({
      census: toDepartmentCensus({ year, records: fall.records }, budget),
      budget,
    }),
    [year, fall, budget],
  )
}

function TableControls({
  view,
  orgs,
  onChange,
}: {
  view: DepartmentsView
  orgs: BudgetYear['orgs']
  onChange: (patch: DepartmentsSearch) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <RadioField
        legend="Show"
        name="level"
        value={view.level}
        options={LEVEL_OPTIONS}
        onSelect={(level) => onChange({ level })}
      />
      {view.level === 'units' && (
        <SelectField
          label="Area"
          value={view.area ?? ALL_AREAS}
          options={[
            [ALL_AREAS, 'All areas'],
            ...listAreas(orgs).map(({ code, name }): [string, string] => [
              code,
              name,
            ]),
          ]}
          onSelect={(area) =>
            onChange({ area: area === ALL_AREAS ? undefined : area })
          }
        />
      )}
      <SearchField
        label="Filter by name or code"
        value={view.q}
        onSearch={(q) => onChange({ q })}
      />
    </div>
  )
}

export function DepartmentsPage() {
  const { now, before } = useLoaderData({ from: '/departments' })
  const view = resolveDepartmentsView(useSearch({ from: '/departments' }))
  const navigate = useNavigate({ from: '/departments' })
  const nowYear = useTableYear(now)
  const beforeYear = useTableYear(before)
  const rows = useMemo(
    () => departmentRows(nowYear, beforeYear),
    [nowYear, beforeYear],
  )
  const isUnits = view.level === 'units'
  const shown = sortRows(
    filterRows(isUnits ? rows.units : rows.areas, {
      q: view.q,
      area: isUnits ? view.area : null,
    }),
    view.sort,
    view.dir,
  )
  const handleChange = (patch: DepartmentsSearch) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    })
  const fiscal = fiscalYearLabel(now.fiscalYear)
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Departments</h1>
      <p className="text-sm text-muted-foreground">
        Each college or VP area in the {fiscal} budget, or each unit and Fall{' '}
        {now.year} pay department, with its budget and jobs and their change
        from {fiscalYearLabel(before.fiscalYear)} and Fall {before.year}. A
        unit’s page shows its budget by year; a pay department’s shows its jobs;
        a code both publish shows both.
      </p>
      <TableControls
        view={view}
        orgs={nowYear.budget.orgs}
        onChange={handleChange}
      />
      {shown.length === 0 ? (
        <p>No area, unit, or department matches.</p>
      ) : (
        <DepartmentTable
          caption={`${isUnits ? 'Units and pay departments' : 'Colleges and VP areas'}: ${fiscal} budget and Fall ${now.year} jobs`}
          rows={shown}
          showArea={isUnits}
          view={view}
          onSort={(sort, dir) => handleChange({ sort, dir })}
        />
      )}
      <SourceCitation
        source={{
          kind: 'budget-range',
          from: before.fiscalYear,
          to: now.fiscalYear,
        }}
        computed={`${DEPARTMENT_TABLE_METHOD} ${PLACEMENT_NOTE}`}
      />
      <SourceCitation
        source={{ kind: 'fall-range', from: before.year, to: now.year }}
      />
    </div>
  )
}

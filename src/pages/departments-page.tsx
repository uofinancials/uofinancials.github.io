import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { DepartmentTable } from '@/components/departments/table'
import { DepartmentTreemap } from '@/components/departments/treemap'
import { RadioField } from '@/components/fields/radio-field'
import { SearchField } from '@/components/fields/search-field'
import { SelectField } from '@/components/fields/select-field'
import { PageHeader } from '@/components/layout/page-header'
import { SkipLink } from '@/components/layout/skip-link'
import { Sources } from '@/components/layout/sources'
import { fiscalYearLabel } from '@/data/budget'
import { departmentsQuery, manifestQuery } from '@/data/queries'
import {
  type DepartmentsSearch,
  type DepartmentsView,
  resolveDepartmentsView,
} from '@/lib/departments/search'
import {
  DEPARTMENT_TABLE_METHOD,
  filterRows,
  sortRows,
} from '@/lib/departments/table'
import { TREEMAP_METHOD } from '@/lib/departments/tiles'
import { fyPaySource, fyPayYears } from '@/lib/trends/trends'

const PLACEMENT_NOTE =
  'Areas and units are the budget’s level-3 and level-5 organisations. A pay department the budget does not publish is counted in the unit this site joins it to by hand; one joined to no unit is listed on its own, placed in an area by a department-name prefix, or by hand, as on the overview.'
const LEVEL_OPTIONS = [
  ['areas', 'Colleges and VP areas'],
  ['units', 'Units and pay departments'],
] as const
const ALL_AREAS = ''
const TABLE_ID = 'departments-table'

function TableControls({
  view,
  areas,
  onChange,
}: {
  view: DepartmentsView
  areas: { code: string; name: string }[]
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
            ...areas.map(({ code, name }): [string, string] => [code, name]),
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

type TableYear = { year: number; fiscalYear: number }

function PageSources({ now, before }: { now: TableYear; before: TableYear }) {
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  return (
    <Sources
      sources={[
        {
          kind: 'budget-range',
          from: before.fiscalYear,
          to: now.fiscalYear,
          computed: `${DEPARTMENT_TABLE_METHOD} ${PLACEMENT_NOTE} ${TREEMAP_METHOD}`,
        },
        {
          kind: 'fall-range',
          from: before.year,
          to: now.year,
        },
        ...fyPaySource(fyPayYears(manifest, [before.year, now.year])),
      ]}
    />
  )
}

export function DepartmentsPage() {
  const { data } = useSuspenseQuery(departmentsQuery)
  const { now, before, rows } = data
  const areas = rows.areas.flatMap(({ code, name }) =>
    code === null ? [] : [{ code, name }],
  )
  const view = resolveDepartmentsView(useSearch({ from: '/departments' }))
  const navigate = useNavigate({ from: '/departments' })
  const isUnits = view.level === 'units'
  const chartArea = isUnits
    ? (areas.find(({ code }) => code === view.area) ?? null)
    : null
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
      resetScroll: false,
    })
  const fiscal = fiscalYearLabel(now.fiscalYear)
  return (
    <div className="space-y-6">
      <PageHeader title="Departments">
        <p>
          Each college or VP area in the {fiscal} budget, or each unit and Fall{' '}
          {now.year} pay department, with its budget and jobs and their change
          from {fiscalYearLabel(before.fiscalYear)} and Fall {before.year}.
        </p>
        <p className="text-sm text-muted-foreground">
          A unit’s page shows its budget by year; a pay department’s shows its
          jobs; a code both publish shows both.
        </p>
      </PageHeader>
      <SkipLink targetId={TABLE_ID} className="focus:inline-block">
        Skip to the table
      </SkipLink>
      <DepartmentTreemap
        rows={
          chartArea
            ? filterRows(rows.units, { q: '', area: chartArea.code })
            : rows.areas
        }
        area={chartArea}
        measure={view.measure}
        now={now}
        before={before}
        onMeasure={(measure) => handleChange({ measure })}
      />
      <div id={TABLE_ID} tabIndex={-1} className="space-y-6 outline-none">
        <TableControls view={view} areas={areas} onChange={handleChange} />
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
      </div>
      <PageSources now={now} before={before} />
    </div>
  )
}

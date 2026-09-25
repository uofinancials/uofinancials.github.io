import { SelectField } from '@/components/select-field'
import { staffKindSchema } from '@/data/fall'
import type { SalariesSearch, SalariesView } from '@/lib/salaries-search'
import { TERMS } from '@/lib/salary-distribution'
import { TREND_GROUPS } from '@/lib/trend-groups'
import { STAFF_KIND_OPTIONS } from '@/lib/trends-search'

const ALL = 'all'
const GROUP_OPTIONS: [string, string][] = [
  [ALL, 'All groups'],
  ...TREND_GROUPS.map((group): [string, string] => [group, group]),
]
const TERM_OPTIONS: [string, string][] = [
  [ALL, '9 and 12 months'],
  ...TERMS.map((term): [string, string] => [String(term), `${term} months`]),
]

/** The salaries view's controls; each change is a new URL search. */
export function SalariesControls({
  view,
  years,
  areas,
  department,
  onChange,
}: {
  view: SalariesView
  years: number[]
  areas: { code: string; name: string }[]
  /** The chosen department when it is not one of `areas`. */
  department: { code: string; name: string } | null
  onChange: (search: SalariesSearch) => void
}) {
  const isArea = areas.some(({ code }) => code === view.dept)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <SelectField
          label="Fall census"
          value={String(view.year)}
          options={years.map((year) => [String(year), String(year)])}
          onSelect={(value) => onChange({ year: Number(value) })}
        />
        <SelectField
          label="Group"
          value={view.group ?? ALL}
          options={GROUP_OPTIONS}
          onSelect={(value) =>
            onChange({ group: TREND_GROUPS.find((group) => group === value) })
          }
        />
        <SelectField
          label="Staff"
          value={view.kind}
          options={STAFF_KIND_OPTIONS}
          onSelect={(value) =>
            onChange({ kind: staffKindSchema.safeParse(value).data })
          }
        />
        <SelectField
          label="Term"
          value={view.term === null ? ALL : String(view.term)}
          options={TERM_OPTIONS}
          onSelect={(value) =>
            onChange({ term: TERMS.find((term) => String(term) === value) })
          }
        />
        <SelectField
          label="College or VP area"
          value={isArea && view.dept ? view.dept : ALL}
          options={[
            [ALL, department ? 'The department below' : 'All of UO'],
            ...areas.map(({ code, name }): [string, string] => [code, name]),
          ]}
          onSelect={(value) =>
            onChange({ dept: value === ALL ? undefined : value })
          }
        />
      </div>
      {department && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          Department: {department.name} ({department.code})
          <button
            type="button"
            className="rounded-md border px-2 py-0.5"
            onClick={() => onChange({ dept: undefined })}
          >
            Remove
          </button>
        </p>
      )}
    </div>
  )
}

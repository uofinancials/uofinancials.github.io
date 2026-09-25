import { RemovableFilter } from '@/components/removable-filter'
import { SelectField } from '@/components/select-field'
import { staffKindSchema } from '@/data/fall'
import type { CensusSearch, CensusView, Place } from '@/lib/census-search'
import { TERMS } from '@/lib/salary-distribution'
import { TREND_GROUPS } from '@/lib/trend-groups'
import {
  ALL_GROUPS,
  GROUP_OPTIONS,
  STAFF_KIND_OPTIONS,
} from '@/lib/trends-search'

const ALL = 'all'
const TERM_OPTIONS: [string, string][] = [
  [ALL, '9 and 12 months'],
  ...TERMS.map((term): [string, string] => [String(term), `${term} months`]),
]

function PlaceFilter({
  place,
  year,
  onChange,
}: {
  place: Place
  year: number
  onChange: (search: CensusSearch) => void
}) {
  if (place.scope === 'unknown') {
    return (
      <p>
        No jobs for code {place.code} in Fall {year}.
      </p>
    )
  }
  if (place.scope !== 'department') return null
  return (
    <RemovableFilter
      text={`Department: ${place.name} (${place.code})`}
      onRemove={() => onChange({ dept: undefined })}
    />
  )
}

/** The census job filters' controls; each change is a new URL search. */
export function CensusControls({
  view,
  years,
  areas,
  place,
  positionName,
  onChange,
}: {
  view: CensusView
  years: number[]
  areas: { code: string; name: string }[]
  place: Place
  positionName: string | null
  onChange: (search: CensusSearch) => void
}) {
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
          value={view.group ?? ALL_GROUPS}
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
          value={place.scope === 'area' ? place.code : ALL}
          options={[
            [
              ALL,
              place.scope === 'department'
                ? 'The department below'
                : 'All of UO',
            ],
            ...areas.map(({ code, name }): [string, string] => [code, name]),
          ]}
          onSelect={(value) =>
            onChange({ dept: value === ALL ? undefined : value })
          }
        />
      </div>
      <PlaceFilter place={place} year={view.year} onChange={onChange} />
      {positionName !== null && (
        <RemovableFilter
          text={`Class or rank: ${positionName}`}
          onRemove={() => onChange({ position: undefined })}
        />
      )}
    </div>
  )
}

import { SelectField } from '@/components/fields/select-field'
import { staffKindSchema } from '@/data/fall'
import { TREND_GROUPS } from '@/lib/census/groups'
import { TERMS } from '@/lib/census/salary-distribution'
import type { CensusSearch, CensusView, Place } from '@/lib/census/search'
import {
  ALL_GROUPS,
  GROUP_OPTIONS,
  STAFF_KIND_OPTIONS,
  TERM_OPTIONS,
} from '@/lib/trends/search'

const ALL = 'all'

/** The census job filters' controls; each change is a new URL search. */
export function CensusControls({
  view,
  years,
  areas,
  place,
  onChange,
}: {
  view: CensusView
  years: number[]
  areas: { code: string; name: string }[]
  place: Place
  onChange: (search: CensusSearch) => void
}) {
  return (
    <>
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
            place.scope === 'department' ? 'The department below' : 'All of UO',
          ],
          ...areas.map(({ code, name }): [string, string] => [code, name]),
        ]}
        onSelect={(value) =>
          onChange({ dept: value === ALL ? undefined : value })
        }
      />
    </>
  )
}

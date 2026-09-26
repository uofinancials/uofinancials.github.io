import { useId } from 'react'
import { AreaSelect } from '@/components/area-select'
import { DraftInput } from '@/components/draft-input'
import { SelectField } from '@/components/select-field'
import { staffKindSchema } from '@/data/fall'
import type { IndexArea } from '@/lib/department-index'
import { TERMS } from '@/lib/salary-distribution'
import type { ScenarioScope } from '@/lib/scenario'
import { TREND_GROUPS } from '@/lib/trend-groups'
import {
  ALL_GROUPS,
  GROUP_OPTIONS,
  STAFF_KIND_OPTIONS,
  TERM_OPTIONS,
} from '@/lib/trends-search'

const ALL = 'all'

function DeptField({
  dept,
  areas,
  onSelect,
}: {
  dept: string | null
  areas: IndexArea[]
  onSelect: (dept: string | null) => void
}) {
  const isListed = areas.some(
    (area) =>
      area.code === dept || area.entries.some((entry) => entry.code === dept),
  )
  return (
    <AreaSelect
      value={dept ?? ALL}
      areas={areas}
      onSelect={(value) => onSelect(value === ALL ? null : value)}
    >
      <option value={ALL}>All of UO</option>
      {dept !== null && !isListed && <option value={dept}>Code {dept}</option>}
    </AreaSelect>
  )
}

function PositionField({
  position,
  positions,
  onSelect,
}: {
  position: string | null
  positions: Map<string, string>
  onSelect: (position: string | null) => void
}) {
  const listId = useId()
  return (
    <>
      <DraftInput
        label="Class or rank"
        list={listId}
        placeholder="Any"
        value={position ?? ''}
        parse={(text) => {
          const key = text.trim()
          if (key === '') return { position: null }
          return positions.has(key) ? { position: key } : null
        }}
        onValue={(parsed) => onSelect(parsed.position)}
      />
      <datalist id={listId}>
        {[...positions].map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </datalist>
    </>
  )
}

/** A rule's scope: group, staff kind, term, department or area, and class or rank. */
export function ScenarioScopeFields({
  scope,
  areas,
  positions,
  onChange,
}: {
  scope: ScenarioScope
  areas: IndexArea[]
  positions: Map<string, string>
  onChange: (scope: ScenarioScope) => void
}) {
  return (
    <div className="flex flex-wrap gap-4">
      <SelectField
        label="Group"
        value={scope.group ?? ALL_GROUPS}
        options={GROUP_OPTIONS}
        onSelect={(value) =>
          onChange({
            ...scope,
            group: TREND_GROUPS.find((group) => group === value) ?? null,
          })
        }
      />
      <SelectField
        label="Staff"
        value={scope.kind}
        options={STAFF_KIND_OPTIONS}
        onSelect={(value) =>
          onChange({
            ...scope,
            kind: staffKindSchema.safeParse(value).data ?? 'all',
          })
        }
      />
      <SelectField
        label="Term"
        value={scope.term === null ? ALL : String(scope.term)}
        options={TERM_OPTIONS}
        onSelect={(value) =>
          onChange({
            ...scope,
            term: TERMS.find((term) => String(term) === value) ?? null,
          })
        }
      />
      <DeptField
        dept={scope.dept}
        areas={areas}
        onSelect={(dept) => onChange({ ...scope, dept })}
      />
      <PositionField
        position={scope.position}
        positions={positions}
        onSelect={(position) => onChange({ ...scope, position })}
      />
    </div>
  )
}

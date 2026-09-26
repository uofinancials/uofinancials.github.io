import type { ReactNode } from 'react'
import { CONTROL_CLASS, FIELD_CLASS } from '@/components/select-field'
import type { IndexArea } from '@/lib/department-index'

/** A department or area picker: `children` options first, then each area's group, led by "All of" when the area has a code. */
export function AreaSelect({
  value,
  areas,
  onSelect,
  children,
}: {
  value: string
  areas: IndexArea[]
  onSelect: (value: string) => void
  children?: ReactNode
}) {
  return (
    <label className={FIELD_CLASS}>
      <span className="text-muted-foreground">Department or area</span>
      <select
        className={CONTROL_CLASS}
        value={value}
        onChange={(event) => onSelect(event.target.value)}
      >
        {children}
        {areas.map((area) => (
          <optgroup key={area.code ?? area.name} label={area.name}>
            {area.code !== null && (
              <option value={area.code}>All of {area.name}</option>
            )}
            {area.entries.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.name} ({entry.code})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

import type { ReactNode } from 'react'
import { CONTROL_CLASS, FIELD_CLASS } from '@/components/fields/select-field'
import { cn } from '@/lib/utils'

export function SearchField({
  label,
  value,
  list,
  children,
  onSearch,
}: {
  label: string
  value: string
  /** The id of a `datalist` of suggestions, given as `children`. */
  list?: string
  children?: ReactNode
  onSearch: (value: string | undefined) => void
}) {
  return (
    <label className={cn(FIELD_CLASS, 'w-full max-w-sm')}>
      <span className="text-muted-foreground">{label}</span>
      <input
        type="search"
        list={list}
        className={cn(CONTROL_CLASS, 'w-full')}
        value={value}
        onChange={(event) => onSearch(event.target.value || undefined)}
      />
      {children}
    </label>
  )
}

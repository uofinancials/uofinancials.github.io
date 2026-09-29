import { CONTROL_CLASS, FIELD_CLASS } from '@/components/fields/select-field'
import { cn } from '@/lib/utils'

export function SearchField({
  label,
  value,
  onSearch,
}: {
  label: string
  value: string
  onSearch: (value: string | undefined) => void
}) {
  return (
    <label className={cn(FIELD_CLASS, 'w-full max-w-sm')}>
      <span className="text-muted-foreground">{label}</span>
      <input
        type="search"
        className={cn(CONTROL_CLASS, 'w-full')}
        value={value}
        onChange={(event) => onSearch(event.target.value || undefined)}
      />
    </label>
  )
}

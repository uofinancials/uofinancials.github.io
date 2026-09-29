import { Chip } from '@/components/fields/chip'
import { clearAllOf, type FilterChip } from '@/lib/shared/filter-chip'

/** The active filters as chips, then a button that clears them all; nothing when none is on. */
export function FilterChips<Search extends object>({
  chips,
  onChange,
}: {
  chips: FilterChip<Search>[]
  onChange: (search: Partial<Search>) => void
}) {
  if (chips.length === 0) return null
  return (
    <ul
      aria-label="Active filters"
      className="flex flex-wrap items-center gap-2"
    >
      {chips.map(({ text, clear }) => (
        <li key={text}>
          <Chip text={text} onRemove={() => onChange(clear)} />
        </li>
      ))}
      <li>
        <button
          type="button"
          className="link py-1 text-sm"
          onClick={() => onChange(clearAllOf(chips))}
        >
          Clear all
        </button>
      </li>
    </ul>
  )
}

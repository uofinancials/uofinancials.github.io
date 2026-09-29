import { SUMMARY_CLASS } from '@/components/layout/disclosure-class'
import { LIST_FIELDS } from '@/lib/people/person-fields'
import type { ListColumn } from '@/lib/people/search'

/** Checkboxes for the people list's optional columns, in table order, behind a toggle. */
export function ColumnPicker({
  columns,
  onChange,
}: {
  columns: readonly ListColumn[]
  onChange: (columns: ListColumn[]) => void
}) {
  const toggle = (column: ListColumn) =>
    onChange(
      LIST_FIELDS.map((field) => field.column).filter((candidate) =>
        candidate === column
          ? !columns.includes(column)
          : columns.includes(candidate),
      ),
    )
  return (
    <details className="text-sm">
      <summary className={SUMMARY_CLASS}>Columns</summary>
      <fieldset className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <legend className="sr-only">Columns shown</legend>
        {LIST_FIELDS.map(({ column, label }) => (
          <label key={column} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={columns.includes(column)}
              onChange={() => toggle(column)}
            />
            {label}
          </label>
        ))}
      </fieldset>
    </details>
  )
}

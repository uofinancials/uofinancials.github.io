import { RemovableFilter } from '@/components/removable-filter'
import { SelectField } from '@/components/select-field'
import { staffKindSchema } from '@/data/fall'
import type { PayChangesSearch, PayChangesView } from '@/lib/pay-changes-search'
import { STAFF_KIND_OPTIONS } from '@/lib/trends-search'

/** The staff kind select and the removable department and class or rank filters; each change is a new URL search. */
export function PayChangesControls({
  view,
  names,
  onChange,
}: {
  view: PayChangesView
  names: { dept: string | null; position: string | null }
  onChange: (search: PayChangesSearch) => void
}) {
  return (
    <div className="space-y-4">
      <SelectField
        label="Staff"
        value={view.kind}
        options={STAFF_KIND_OPTIONS}
        onSelect={(value) =>
          onChange({ kind: staffKindSchema.safeParse(value).data })
        }
      />
      {names.dept !== null && (
        <RemovableFilter
          text={`Pay department: ${names.dept}`}
          onRemove={() => onChange({ dept: undefined })}
        />
      )}
      {names.position !== null && (
        <RemovableFilter
          text={`Class or rank: ${names.position}`}
          onRemove={() => onChange({ position: undefined })}
        />
      )}
    </div>
  )
}

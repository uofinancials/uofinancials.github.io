import { type ComponentProps, useState } from 'react'
import { CONTROL_CLASS, FIELD_CLASS } from '@/components/select-field'
import { cn } from '@/lib/utils'

/**
 * A text field over a parsed value: what is typed stays as typed while the
 * field has focus, and each valid entry is passed up as soon as it parses.
 */
export function DraftInput<T>({
  label,
  value,
  parse,
  onValue,
  ...inputProps
}: {
  label: string
  value: string
  parse: (text: string) => T | null
  onValue: (value: T) => void
} & Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'onBlur'>) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className={FIELD_CLASS}>
      <span className="text-muted-foreground">{label}</span>
      <input
        {...inputProps}
        className={cn(CONTROL_CLASS, 'w-32 aria-invalid:border-destructive')}
        value={draft ?? value}
        aria-invalid={draft !== null && parse(draft) === null}
        onChange={(event) => {
          setDraft(event.target.value)
          const parsed = parse(event.target.value)
          if (parsed !== null) onValue(parsed)
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  )
}

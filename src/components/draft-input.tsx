import { type ComponentProps, useState } from 'react'

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
    <label className="flex w-fit max-w-full flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        {...inputProps}
        className="w-32 max-w-full rounded-md border bg-background px-2 py-1 aria-invalid:border-destructive"
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

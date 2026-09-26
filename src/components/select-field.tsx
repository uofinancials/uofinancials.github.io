/** A labelled field's wrapper and control classes, shared by every form field. */
export const FIELD_CLASS = 'flex w-fit max-w-full flex-col gap-1 text-sm'
export const CONTROL_CLASS =
  'max-w-full rounded-md border bg-background px-2 py-1'

export function SelectField({
  label,
  value,
  options,
  onSelect,
}: {
  label: string
  value: string
  options: [string, string][]
  onSelect: (value: string) => void
}) {
  return (
    <label className={FIELD_CLASS}>
      <span className="text-muted-foreground">{label}</span>
      <select
        className={CONTROL_CLASS}
        value={value}
        onChange={(event) => onSelect(event.target.value)}
      >
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

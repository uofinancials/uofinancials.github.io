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
    <label className="flex w-fit flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        className="rounded-md border bg-background px-2 py-1"
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

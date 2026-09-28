export function RadioField<T extends string>({
  legend,
  name,
  value,
  options,
  onSelect,
}: {
  legend: string
  name: string
  value: T
  options: readonly (readonly [T, string])[]
  onSelect: (value: T) => void
}) {
  return (
    <fieldset className="flex flex-wrap gap-4 text-sm">
      <legend className="mb-1 text-muted-foreground">{legend}</legend>
      {options.map(([option, text]) => (
        <label key={option} className="flex items-center gap-2">
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onSelect(option)}
          />
          {text}
        </label>
      ))}
    </fieldset>
  )
}

/** One row of joined buttons that are still radios to the keyboard and screen readers; it scrolls sideways when the options do not fit. */
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
    <fieldset className="text-sm">
      <legend className="mb-1 text-muted-foreground">{legend}</legend>
      <div className="scroll-edge flex w-fit max-w-full overflow-x-auto rounded-md border bg-background p-0.5">
        {options.map(([option, text]) => (
          <label key={option} className="relative flex shrink-0 cursor-pointer">
            <input
              type="radio"
              name={name}
              checked={value === option}
              onChange={() => onSelect(option)}
              className="peer absolute inset-0 cursor-pointer appearance-none opacity-0"
            />
            <span className="rounded px-3 py-0.5 whitespace-nowrap peer-checked:bg-primary peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-ring peer-[:hover:not(:checked)]:bg-muted">
              {text}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

import { cn } from '@/lib/utils'

/** Radio buttons, or with `isSegmented` one row of joined buttons that are still radios to the keyboard and screen readers. */
export function RadioField<T extends string>({
  legend,
  name,
  value,
  options,
  isSegmented = false,
  onSelect,
}: {
  legend: string
  name: string
  value: T
  options: readonly (readonly [T, string])[]
  isSegmented?: boolean
  onSelect: (value: T) => void
}) {
  return (
    <fieldset className="min-w-0 text-sm">
      <legend className="mb-1 text-muted-foreground">{legend}</legend>
      <div
        className={cn(
          'flex',
          isSegmented
            ? 'scroll-edge w-fit max-w-full overflow-x-auto rounded-md border p-0.5'
            : 'flex-wrap gap-4',
        )}
      >
        {options.map(([option, text]) => (
          <label
            key={option}
            className={cn(
              'flex items-center gap-2',
              isSegmented && 'relative shrink-0 cursor-pointer',
            )}
          >
            <input
              type="radio"
              name={name}
              checked={value === option}
              onChange={() => onSelect(option)}
              className={cn(
                isSegmented &&
                  'peer absolute inset-0 cursor-pointer appearance-none opacity-0',
              )}
            />
            {isSegmented ? (
              <span className="rounded px-3 py-0.5 whitespace-nowrap peer-checked:bg-primary peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-ring peer-[:hover:not(:checked)]:bg-muted">
                {text}
              </span>
            ) : (
              text
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

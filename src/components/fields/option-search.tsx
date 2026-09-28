import { type KeyboardEvent, useId, useState } from 'react'
import { type CompareOption, matchOptions } from '@/lib/trends/compare'
import { cn } from '@/lib/utils'
import { CONTROL_CLASS, FIELD_CLASS } from './select-field'

function OptionList({
  id,
  label,
  matches,
  highlighted,
  onPick,
}: {
  id: string
  label: string
  matches: CompareOption[]
  highlighted: CompareOption | undefined
  onPick: (option: CompareOption) => void
}) {
  return (
    <div
      id={id}
      role="listbox"
      aria-label={label}
      className="absolute z-20 mt-1 max-h-72 w-full min-w-72 overflow-y-auto rounded-md border bg-background py-1 text-sm shadow-md"
    >
      {matches.map((option) => (
        <div
          key={option.code}
          id={`${id}-${option.code}`}
          role="option"
          aria-selected={option === highlighted}
          tabIndex={-1}
          className={cn(
            'cursor-pointer px-3 py-1.5',
            option === highlighted && 'bg-muted',
          )}
          onMouseDown={(event) => {
            event.preventDefault()
            onPick(option)
          }}
        >
          {option.name}
          <span className="block text-xs text-muted-foreground">
            {option.area ?? 'College or VP area'}
          </span>
        </div>
      ))}
    </div>
  )
}

/** A text box that lists the areas and units matching what is typed, as a combobox: arrows move through the list, Enter or a click adds the highlighted one, Escape clears. */
export function OptionSearch({
  label,
  options,
  chosen,
  onAdd,
}: {
  label: string
  options: CompareOption[]
  /** Codes already added, left out of the list. */
  chosen: string[]
  onAdd: (code: string) => void
}) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const matches = matchOptions(options, query, chosen)
  const highlighted = matches[Math.min(active, matches.length - 1)]
  const add = (option: CompareOption | undefined) => {
    if (!option) return
    onAdd(option.code)
    setQuery('')
    setActive(0)
  }
  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive(Math.max(0, Math.min(matches.length - 1, active + step)))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      add(highlighted)
    } else if (event.key === 'Escape') {
      setQuery('')
    }
  }
  return (
    <div className="relative">
      <label className={FIELD_CLASS}>
        <span className="text-muted-foreground">{label}</span>
        <input
          type="text"
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            highlighted ? `${listId}-${highlighted.code}` : undefined
          }
          className={cn(CONTROL_CLASS, 'w-72 max-w-full')}
          placeholder="Type a college, area, or unit"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={handleKey}
        />
      </label>
      {matches.length > 0 && (
        <OptionList
          id={listId}
          label={label}
          matches={matches}
          highlighted={highlighted}
          onPick={add}
        />
      )}
    </div>
  )
}

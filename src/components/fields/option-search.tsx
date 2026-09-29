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

/** Arrow keys move through the list, Enter picks the highlighted option, Escape clears what was typed. */
function keyHandler({
  count,
  active,
  onActive,
  onPick,
  onEscape,
}: {
  count: number
  active: number
  onActive: (index: number) => void
  onPick: () => void
  onEscape: () => void
}) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      onActive(Math.max(0, Math.min(count - 1, active + step)))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      onPick()
    } else if (event.key === 'Escape') {
      onEscape()
    }
  }
}

/** The search's typed text, highlighted row, and whether it is being edited, and the options it lists. */
function useOptionSearch({
  options,
  chosen,
  isSelect,
  onAdd,
}: {
  options: CompareOption[]
  chosen: string[]
  isSelect: boolean
  onAdd: (code: string) => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [isEditing, setEditing] = useState(false)
  const matches =
    isSelect && isEditing && query.trim() === ''
      ? options.filter(({ code }) => !chosen.includes(code))
      : matchOptions(options, query, chosen)
  const shown = isSelect && !isEditing ? [] : matches
  const close = () => {
    setEditing(false)
    setQuery('')
    setActive(0)
  }
  return {
    query,
    active,
    isEditing,
    shown,
    highlighted: shown[Math.min(active, shown.length - 1)],
    setActive,
    setEditing,
    close,
    type: (text: string) => {
      setEditing(true)
      setQuery(text)
      setActive(0)
    },
    pick: (option: CompareOption | undefined) => {
      if (!option) return
      onAdd(option.code)
      close()
    },
  }
}

/**
 * A text box listing the options that match what is typed, as a combobox.
 * Without `selected` it adds each pick and empties; with it, it shows the
 * pick, lists every option when focused and empty, and offers a clear button.
 */
export function OptionSearch({
  label,
  options,
  chosen = [],
  selected,
  placeholder = 'Type a college, area, or unit',
  onAdd,
  onClear,
}: {
  label: string
  options: CompareOption[]
  /** Codes already added, left out of the list. */
  chosen?: string[]
  /** The option picked, or `null` for none; absent for a box that adds. */
  selected?: CompareOption | null
  placeholder?: string
  onAdd: (code: string) => void
  onClear?: () => void
}) {
  const listId = useId()
  const isSelect = selected !== undefined
  const search = useOptionSearch({ options, chosen, isSelect, onAdd })
  const { query, active, isEditing, shown, highlighted } = search
  return (
    <div className="relative">
      <label className={FIELD_CLASS}>
        <span className="text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1">
          <input
            type="text"
            role="combobox"
            aria-expanded={shown.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              highlighted ? `${listId}-${highlighted.code}` : undefined
            }
            className={cn(CONTROL_CLASS, 'w-72 max-w-full')}
            placeholder={placeholder}
            value={isSelect && !isEditing ? (selected?.name ?? '') : query}
            onFocus={() => search.setEditing(true)}
            onBlur={search.close}
            onChange={(event) => search.type(event.target.value)}
            onKeyDown={keyHandler({
              count: shown.length,
              active,
              onActive: search.setActive,
              onPick: () => search.pick(highlighted),
              onEscape: () => search.type(''),
            })}
          />
          {selected && onClear && (
            <button
              type="button"
              aria-label={`Clear ${label}`}
              className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onClear}
            >
              ×
            </button>
          )}
        </span>
      </label>
      {shown.length > 0 && (
        <OptionList
          id={listId}
          label={label}
          matches={shown}
          highlighted={highlighted}
          onPick={search.pick}
        />
      )}
    </div>
  )
}

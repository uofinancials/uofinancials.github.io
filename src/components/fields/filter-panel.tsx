import { type ReactNode, useState } from 'react'
import { BUTTON_CLASS } from '@/components/fields/button-class'
import { cn } from '@/lib/utils'

function FiltersToggle({
  isOpen,
  summary,
  onToggle,
}: {
  isOpen: boolean
  summary: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-2 text-left text-sm md:hidden"
    >
      <span>{summary}</span>
      <span className={cn(BUTTON_CLASS, 'shrink-0 bg-background')}>
        {isOpen ? 'Close' : 'Filters'}
      </span>
    </button>
  )
}

/** A page's filters in one card, folded behind a button that shows `summary` on a phone; `isSticky` keeps it in view from `md`. */
export function FilterPanel({
  summary,
  isSticky = false,
  children,
}: {
  summary: string
  isSticky?: boolean
  children: ReactNode
}) {
  const [isOpen, setOpen] = useState(false)
  return (
    <div
      className={cn(
        'rounded-xl border bg-muted p-3 md:p-4',
        isSticky && 'z-10 md:sticky md:top-2',
      )}
    >
      <FiltersToggle
        isOpen={isOpen}
        summary={summary}
        onToggle={() => setOpen(!isOpen)}
      />
      <div
        className={cn(
          'mt-3 flex-wrap items-end gap-4 md:mt-0 md:flex',
          isOpen ? 'flex' : 'hidden',
        )}
      >
        {children}
      </div>
    </div>
  )
}

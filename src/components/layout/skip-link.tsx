import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A link shown only while it has keyboard focus, which moves focus to the element with the id; that element must take focus (`tabIndex={-1}`). */
export function SkipLink({
  targetId,
  className,
  children,
}: {
  targetId: string
  className?: string
  children: ReactNode
}) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'sr-only focus:not-sr-only focus:rounded-md focus:border focus:bg-background focus:px-3 focus:py-2 focus:text-sm',
        className,
      )}
      onClick={(event) => {
        event.preventDefault()
        document.getElementById(targetId)?.focus()
      }}
    >
      {children}
    </a>
  )
}

import type { ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'

/** Tailwind's `md` breakpoint. */
const WIDE = '(min-width: 48rem)'

/** A page section whose heading opens and closes it, open on wide screens and, unless asked open, closed on a phone. */
export function CollapsibleSection({
  id,
  title,
  isOpen = false,
  children,
}: {
  id: string
  title: string
  isOpen?: boolean
  children: ReactNode
}) {
  const isWide = useMediaQuery(WIDE)
  return (
    <details id={id} open={isWide || isOpen} className="space-y-4">
      <summary className="cursor-pointer list-inside marker:text-muted-foreground">
        <h2 className="inline text-section">{title}</h2>
      </summary>
      <div className="space-y-4">{children}</div>
    </details>
  )
}

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

/** Tailwind's `md` breakpoint. */
const WIDE = '(min-width: 48rem)'

/** A page section whose heading opens and closes it: open at first on a wide screen, when asked, or when the URL names it; the reader's choice after that. */
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
  const [open, setOpen] = useState(
    () =>
      isOpen ||
      window.matchMedia(WIDE).matches ||
      window.location.hash === `#${id}`,
  )
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === `#${id}`) setOpen(true)
    }
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [id])
  return (
    <details
      id={id}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="space-y-4"
    >
      <summary className="cursor-pointer list-inside marker:text-muted-foreground">
        <h2 className="inline text-section">{title}</h2>
      </summary>
      <div className="space-y-4">{children}</div>
    </details>
  )
}

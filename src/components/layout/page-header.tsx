import type { ReactNode } from 'react'

/** A page's title with its lead and any caveat beneath it. */
export function PageHeader({
  title,
  children,
}: {
  title: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="space-y-2">
      <h1 className="text-title">{title}</h1>
      {children}
    </header>
  )
}

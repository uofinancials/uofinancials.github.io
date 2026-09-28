import type { ReactNode } from 'react'

export function PageSection({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-section">{title}</h2>
      {children}
    </section>
  )
}

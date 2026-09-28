import { Link, type LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const CARD = 'block rounded-xl border p-4'

/** A labelled headline figure, with any detail below it; a link to `to` when given. */
export function StatCard({
  label,
  value,
  to,
  children,
}: {
  label: string
  value: string
  to?: LinkProps['to']
  children?: ReactNode
}) {
  const body = (
    <>
      <span className="block text-sm text-muted-foreground">{label}</span>
      <span className="block text-figure tabular-nums">{value}</span>
      {children}
    </>
  )
  return to ? (
    <Link to={to} className={cn(CARD, 'hover:bg-muted')}>
      {body}
    </Link>
  ) : (
    <div className={CARD}>{body}</div>
  )
}

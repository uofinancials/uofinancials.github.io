import type { ReactNode } from 'react'
import { tabTitleOf } from '@/lib/shared/format'

/** The page's h1 and the lines under it; the tab title is `tabTitle`, or the h1 when it is text, and `null` keeps the site's own. */
export function PageHeader({
  title,
  tabTitle,
  children,
}: {
  title: ReactNode
  tabTitle?: string | null
  children?: ReactNode
}) {
  const tab =
    tabTitle === undefined && typeof title === 'string'
      ? tabTitleOf(title)
      : tabTitle
  return (
    <header className="space-y-2">
      {tab && <title>{tab}</title>}
      <h1 className="text-title">{title}</h1>
      {children}
    </header>
  )
}

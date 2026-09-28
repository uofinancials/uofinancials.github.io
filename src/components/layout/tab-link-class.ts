import { cn } from '@/lib/utils'

/** The classes of a tab drawn as a link, the current one raised. */
export function tabLinkClass(isCurrent: boolean): string {
  return cn(
    'block rounded-t-md px-3 py-1 text-sm',
    isCurrent
      ? 'border border-b-0 bg-background font-semibold'
      : 'text-muted-foreground hover:text-foreground',
  )
}

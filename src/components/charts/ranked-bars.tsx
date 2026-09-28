import { formatChange } from '@/lib/shared/format'
import { rankByChange } from '@/lib/shared/series'
import { cn } from '@/lib/utils'

const PERCENT = 100

/** Each item's change as a bar, largest first, for screens too narrow for a line chart; a fall is drawn in the muted color. */
export function RankedBars({
  items,
  label,
  className,
}: {
  items: { key: string; change: number | null }[]
  label: string
  className?: string
}) {
  return (
    <ul aria-label={label} className={cn('space-y-2 text-sm', className)}>
      {rankByChange(items).map(({ key, change, share }) => (
        <li key={key} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          <span>{key}</span>
          <span className="text-right tabular-nums">
            {formatChange(change)}
          </span>
          <span aria-hidden className="col-span-2 block h-2">
            <span
              className={cn(
                'block h-full rounded-sm',
                change < 0 ? 'bg-muted-foreground/50' : 'bg-chart',
              )}
              style={{ width: `${share * PERCENT}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  )
}

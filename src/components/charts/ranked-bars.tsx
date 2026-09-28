import { formatChange } from '@/lib/shared/format'
import { rankByChange } from '@/lib/shared/series'
import { cn, widthOf } from '@/lib/utils'

/** Each item's change as a bar, largest first, rises right of zero and falls left of it; a fall is drawn muted and the emphasized item, the reference, in the foreground color. On a wide screen each bar sits between its name and its figure. */
export function RankedBars({
  items,
  emphasis,
  label,
  className,
}: {
  items: { key: string; change: number | null }[]
  emphasis?: string
  label: string
  className?: string
}) {
  const { zero, ranked } = rankByChange(items)
  return (
    <ul aria-label={label} className={cn('space-y-2 text-sm', className)}>
      {ranked.map(({ key, change, offset, width }) => {
        const isEmphasis = key === emphasis
        return (
          <li
            key={key}
            className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 md:grid-cols-[14rem_1fr_5rem] md:gap-x-4"
          >
            <span className={cn(isEmphasis && 'font-semibold')}>{key}</span>
            <span
              className={cn(
                'text-right tabular-nums md:order-last',
                isEmphasis && 'font-semibold',
              )}
            >
              {formatChange(change)}
            </span>
            <span
              aria-hidden
              className="relative col-span-2 block h-2 md:col-span-1 md:h-4"
            >
              {zero > 0 && (
                <span
                  className="absolute -inset-y-1 w-px bg-foreground/40"
                  style={{ left: widthOf(zero) }}
                />
              )}
              <span
                className={cn(
                  'absolute inset-y-0 rounded-sm',
                  isEmphasis && 'bg-foreground/60',
                  !isEmphasis && change < 0 && 'bg-muted-foreground/50',
                  !isEmphasis && change >= 0 && 'bg-chart',
                )}
                style={{ left: widthOf(offset), width: widthOf(width) }}
              />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

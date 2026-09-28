import type { ReactNode } from 'react'
import { TableCell } from '@/components/ui/table'
import { NUMBER_CELL } from '@/lib/utils'

const PERCENT = 100

/** A number cell with a bar beside its figure, the bar's length the value's share of the column's largest. */
export function BarCell({
  share,
  children,
}: {
  /** From 0 to 1. */
  share: number
  children: ReactNode
}) {
  return (
    <TableCell className={NUMBER_CELL}>
      <div className="flex items-center justify-end gap-3">
        <span>{children}</span>
        <span aria-hidden className="h-3 w-20 shrink-0 sm:w-40">
          <span
            className="block h-full rounded-sm bg-chart/70"
            style={{ width: `${share * PERCENT}%` }}
          />
        </span>
      </div>
    </TableCell>
  )
}

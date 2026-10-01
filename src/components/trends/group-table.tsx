import type { ReactNode } from 'react'
import { BarCell } from '@/components/charts/bar-cell'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, NUMBER_CELL } from '@/lib/utils'

export type GroupCell = {
  value: ReactNode
  /** Draws a bar beside the value, as `BarCell` does. */
  share?: number
  className?: string
}

export type GroupRow = {
  key: string
  /** Shown in place of the key, such as a link. */
  label?: ReactNode
  isTotal?: boolean
  isHighlighted?: boolean
  cells: GroupCell[]
}

/** A table of one row per group, its name heading the row and its figures right-aligned; a total row's name is bold. */
export function GroupTable({
  caption,
  heading = 'Group',
  columns,
  rows,
  containerClassName,
}: {
  caption: string
  heading?: string
  columns: string[]
  rows: GroupRow[]
  containerClassName?: string
}) {
  return (
    <Table containerClassName={containerClassName}>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{heading}</TableHead>
          {columns.map((column) => (
            <TableHead key={column} scope="col" className="text-right">
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ key, label, isTotal, isHighlighted, cells }) => (
          <TableRow
            key={key}
            className={cn(isHighlighted && '[--row-tint:var(--muted)]')}
          >
            <TableHead scope="row" className={cn(!isTotal && 'font-normal')}>
              {label ?? key}
            </TableHead>
            {cells.map(({ value, share, className }, index) =>
              share === undefined ? (
                <TableCell
                  key={columns[index]}
                  className={cn(NUMBER_CELL, className)}
                >
                  {value}
                </TableCell>
              ) : (
                <BarCell key={columns[index]} share={share}>
                  {value}
                </BarCell>
              ),
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

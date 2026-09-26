import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCount } from '@/lib/format'
import type { GroupCounts, TrendGroup } from '@/lib/trend-groups'
import { NUMBER_CELL } from '@/lib/utils'

/** A histogram's numbers: one row per bin, its count in each group and in total. */
export function BinTable<Bin extends { counts: GroupCounts; total: number }>({
  bins,
  groups,
  heading,
  caption,
  rowKey,
  rowHeader,
}: {
  bins: Bin[]
  groups: TrendGroup[]
  heading: string
  caption?: string
  rowKey: (bin: Bin) => string | number
  rowHeader: (bin: Bin) => ReactNode
}) {
  return (
    <Table>
      {caption && <caption className="sr-only">{caption}</caption>}
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{heading}</TableHead>
          {groups.map((group) => (
            <TableHead key={group} scope="col" className="text-right">
              {group}
            </TableHead>
          ))}
          <TableHead scope="col" className="text-right">
            Total
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bins.map((bin) => (
          <TableRow key={rowKey(bin)}>
            <TableHead scope="row" className="font-normal">
              {rowHeader(bin)}
            </TableHead>
            {groups.map((group) => (
              <TableCell key={group} className={NUMBER_CELL}>
                {formatCount(bin.counts[group])}
              </TableCell>
            ))}
            <TableCell className={NUMBER_CELL}>
              {formatCount(bin.total)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

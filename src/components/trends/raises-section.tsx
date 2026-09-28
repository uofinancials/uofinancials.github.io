import { Link } from '@tanstack/react-router'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Summary } from '@/data/summary'
import { formatChange, formatOrBlank } from '@/lib/shared/format'
import { ALL_PAIRS, pairLabel } from '@/lib/trends/pay-changes'
import { heatLevel, raiseRows } from '@/lib/trends/report'
import { raisesAnswer } from '@/lib/trends/report-text'
import { cn, NUMBER_CELL } from '@/lib/utils'
import { CONTINUING_JOB_METHOD, RATE_NOTE } from './pay-changes-section'

/** Each shading level's cell classes, from no change to the largest. */
const HEAT_CLASSES = [
  '',
  'bg-chart/10',
  'bg-chart/20',
  'bg-chart/35',
  'bg-chart/55',
  'bg-chart text-background',
]

const CHAINED_METHOD =
  'Chained is each pair’s median change compounded, one after another; it is not any one person’s raise.'

/** Continuing jobs' median change in salary rate by group and census pair, shaded by size, with each row chained. */
export function RaisesSection({
  payChanges,
  fromYears,
  from,
  to,
}: {
  payChanges: Summary['trends']['payChanges']
  fromYears: number[]
  from: number
  to: number
}) {
  const rows = raiseRows(payChanges, fromYears)
  return (
    <PageSection id="raises" title="What raises did people who stayed get?">
      {fromYears.length === 0 ? (
        <p>A change needs two consecutive censuses; choose a wider range.</p>
      ) : (
        <>
          <p>{raisesAnswer(rows, fromYears)}</p>
          <p className="text-sm text-muted-foreground">{RATE_NOTE}</p>
          <Table>
            <caption className="sr-only">
              Median change in salary rate, continuing jobs, by group and census
              pair
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Group</TableHead>
                {fromYears.map((year) => (
                  <TableHead key={year} scope="col" className="text-right">
                    {pairLabel(year)}
                  </TableHead>
                ))}
                <TableHead scope="col" className="text-right">
                  Chained
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ key, medians, chained }) => (
                <TableRow key={key}>
                  <TableHead
                    scope="row"
                    className={key === ALL_PAIRS ? '' : 'font-normal'}
                  >
                    {key}
                  </TableHead>
                  {medians.map((median, index) => (
                    <TableCell
                      key={fromYears[index]}
                      className={cn(
                        NUMBER_CELL,
                        median !== null && HEAT_CLASSES[heatLevel(median)],
                      )}
                    >
                      {formatOrBlank(median, formatChange)}
                    </TableCell>
                  ))}
                  <TableCell className={cn(NUMBER_CELL, 'font-semibold')}>
                    {formatOrBlank(chained, formatChange)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
      <p className="text-sm">
        <Link className="link" to="/trends/pay-changes">
          Pay changes by department, area, or class or rank, one pair’s
          distribution, and raises beside the contract terms
        </Link>
      </p>
      <Sources
        sources={[
          {
            kind: 'fall-range',
            from,
            to,
            computed: CONTINUING_JOB_METHOD,
          },
        ]}
        methods={[CHAINED_METHOD]}
      />
    </PageSection>
  )
}

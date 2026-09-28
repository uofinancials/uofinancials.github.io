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
import { SPEND_METHOD } from '@/lib/census/totals'
import {
  formatChange,
  formatDollarChange,
  formatDollars,
  formatOrBlank,
} from '@/lib/shared/format'
import {
  ALL_JOBS,
  stepBars,
  type VolumeAndPay,
  volumeAndPay,
  volumeAndPayByGroup,
} from '@/lib/trends/report'
import { splitAnswer } from '@/lib/trends/report-text'
import type { Trends } from '@/lib/trends/trends'
import { cn, NUMBER_CELL } from '@/lib/utils'

const PERCENT = 100

function stepLabels(from: number, to: number): Record<string, string> {
  return {
    first: `Salary spend, Fall ${from}`,
    volume: `Change in FTE, at Fall ${from} spend per FTE`,
    pay: 'Change in spend per FTE',
    last: `Salary spend, Fall ${to}`,
  }
}

function StepFigure({
  firstCents,
  split,
  from,
  to,
}: {
  firstCents: number
  split: VolumeAndPay
  from: number
  to: number
}) {
  const labels = stepLabels(from, to)
  return (
    <ul className="space-y-3">
      {stepBars(firstCents, split).map(({ key, cents, offset, width }) => {
        const isTotal = key === 'first' || key === 'last'
        return (
          <li
            key={key}
            className="grid gap-1 text-sm md:grid-cols-[18rem_1fr_9rem] md:items-center md:gap-4"
          >
            <span>{labels[key]}</span>
            <span aria-hidden className="relative block h-5">
              <span
                className={cn(
                  'absolute inset-y-0 rounded-sm',
                  isTotal ? 'bg-muted-foreground/60' : 'bg-chart',
                )}
                style={{
                  left: `${offset * PERCENT}%`,
                  width: `${width * PERCENT}%`,
                }}
              />
            </span>
            <span className="tabular-nums md:text-right">
              {isTotal ? formatDollars(cents) : formatDollarChange(cents)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function ByGroupTable({
  trends,
  split,
}: {
  trends: Trends
  split: VolumeAndPay
}) {
  const rows = [
    ...volumeAndPayByGroup(trends),
    { key: ALL_JOBS, fte: split.fteChange, perFte: split.perFteChange },
  ]
  return (
    <Table>
      <caption className="sr-only">
        Change in FTE and in salary spend per FTE by group
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Group</TableHead>
          <TableHead scope="col" className="text-right">
            FTE
          </TableHead>
          <TableHead scope="col" className="text-right">
            Spend per FTE
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ key, fte, perFte }) => (
          <TableRow key={key}>
            <TableHead
              scope="row"
              className={key === ALL_JOBS ? '' : 'font-normal'}
            >
              {key}
            </TableHead>
            <TableCell className={NUMBER_CELL}>
              {formatOrBlank(fte, formatChange)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatOrBlank(perFte, formatChange)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** The change in salary spend split into more FTE and higher pay per FTE, in all and by group. */
export function SplitSection({
  trends,
  from,
  to,
}: {
  trends: Trends
  from: number
  to: number
}) {
  const split = volumeAndPay(trends)
  const firstCents = trends.total[0]?.spendCents ?? null
  const method = `${SPEND_METHOD} FTE leaves out classified temporaries, as salary spend does. The change in FTE at Fall ${from} spend per FTE is the change in FTE times Fall ${from} spend over Fall ${from} FTE; the rest of the change in spend is the change in spend per FTE.`
  return (
    <PageSection id="pay-or-people" title="More people, or higher pay?">
      {split && firstCents !== null ? (
        <>
          <p>{splitAnswer(split, from)}</p>
          <StepFigure
            firstCents={firstCents}
            split={split}
            from={from}
            to={to}
          />
          <ByGroupTable trends={trends} split={split} />
        </>
      ) : (
        <p>
          Spend or FTE is missing in Fall {from} or Fall {to}.
        </p>
      )}
      <Sources sources={[{ kind: 'fall-range', from, to, computed: method }]} />
    </PageSection>
  )
}

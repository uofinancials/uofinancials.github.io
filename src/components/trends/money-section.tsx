import { Link } from '@tanstack/react-router'
import { BarCell } from '@/components/charts/bar-cell'
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
  formatDollarChange,
  formatOrBlank,
  formatShare,
} from '@/lib/shared/format'
import { shareOfLargest } from '@/lib/shared/series'
import { ALL_JOBS, spendContributions, spendShares } from '@/lib/trends/report'
import { moneyAnswer } from '@/lib/trends/report-text'
import type { Trends } from '@/lib/trends/trends'
import { NUMBER_CELL } from '@/lib/utils'
import { groupColor } from './group-color'

const PERCENT = 100

const METHOD = `${SPEND_METHOD} A group’s share is its spend over all spend in the census; its share of the rise is its change in spend over the change in all spend. A group with no job in a census counts as no spend there.`

function ShareBar({ shares }: { shares: { key: string; share: number }[] }) {
  return (
    <div aria-hidden className="flex h-6 w-full overflow-hidden rounded-sm">
      {shares.map(({ key, share }) => (
        <span
          key={key}
          className="h-full border-r border-background last:border-r-0"
          style={{ width: `${share * PERCENT}%`, background: groupColor(key) }}
        />
      ))}
    </div>
  )
}

function SharesFigure({
  trends,
  from,
  to,
}: {
  trends: Trends
  from: number
  to: number
}) {
  const first = spendShares(trends, 0)
  const last = spendShares(trends, trends.total.length - 1)
  const shareIn = (shares: typeof first, key: string) =>
    shares.find((share) => share.key === key)?.share ?? null
  return (
    <div className="space-y-3">
      <h3 className="font-medium">Share of salary spend</h3>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        <span className="text-muted-foreground tabular-nums">Fall {from}</span>
        <ShareBar shares={first} />
        <span className="text-muted-foreground tabular-nums">Fall {to}</span>
        <ShareBar shares={last} />
      </div>
      <Table>
        <caption className="sr-only">
          Share of salary spend by group, Fall {from} and Fall {to}
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Group</TableHead>
            <TableHead scope="col" className="text-right">
              Fall {from}
            </TableHead>
            <TableHead scope="col" className="text-right">
              Fall {to}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {last.map(({ key }) => (
            <TableRow key={key}>
              <TableHead scope="row" className="font-normal">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-sm"
                    style={{ background: groupColor(key) }}
                  />
                  {key}
                </span>
              </TableHead>
              <TableCell className={NUMBER_CELL}>
                {formatOrBlank(shareIn(first, key), (share) =>
                  formatShare(share, 1),
                )}
              </TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatOrBlank(shareIn(last, key), (share) =>
                  formatShare(share, 1),
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RiseTable({
  trends,
  from,
  to,
}: {
  trends: Trends
  from: number
  to: number
}) {
  const rows = spendContributions(trends)
  const bars = shareOfLargest(
    rows.map(({ key, changeCents }) => (key === ALL_JOBS ? null : changeCents)),
  )
  return (
    <div className="space-y-3">
      <h3 className="font-medium">Change in salary spend by group</h3>
      <Table>
        <caption className="sr-only">
          Change in salary spend by group, Fall {from} to Fall {to}
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Group</TableHead>
            <TableHead scope="col" className="text-right">
              Change
            </TableHead>
            <TableHead scope="col" className="text-right">
              Of the change
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ key, changeCents, share }, index) => (
            <TableRow key={key}>
              <TableHead
                scope="row"
                className={key === ALL_JOBS ? '' : 'font-normal'}
              >
                {key}
              </TableHead>
              <BarCell share={key === ALL_JOBS ? undefined : bars[index]}>
                {formatOrBlank(changeCents, formatDollarChange)}
              </BarCell>
              <TableCell className={NUMBER_CELL}>
                {formatOrBlank(share, (value) => formatShare(value, 1))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Each group's share of salary spend in the first and last census, and its part of the change between them. */
export function MoneySection({
  trends,
  from,
  to,
}: {
  trends: Trends
  from: number
  to: number
}) {
  return (
    <PageSection id="money" title="Where did the money go?">
      <p>{moneyAnswer(spendContributions(trends), { from, to })}</p>
      <SharesFigure trends={trends} from={from} to={to} />
      <RiseTable trends={trends} from={from} to={to} />
      <p className="text-sm text-muted-foreground">
        Salary spend counts pay from every fund; the{' '}
        <Link className="link" to="/budget">
          budget outlook
        </Link>{' '}
        projects the E&amp;G fund only, so the two are not the same money.
      </p>
      <Sources sources={[{ kind: 'fall-range', from, to, computed: METHOD }]} />
    </PageSection>
  )
}

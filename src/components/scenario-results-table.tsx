import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ScenarioHistory } from '@/components/use-scenario-history'
import { fiscalYearLabel } from '@/data/budget'
import {
  formatCount,
  formatDollars,
  formatOrBlank,
  formatShare,
} from '@/lib/format'
import type { RuleResult, Savings } from '@/lib/scenario'
import { smallReachNote } from '@/lib/scenario-labels'
import { toPercent } from '@/lib/scenario-search'

type HistoryStatus = ScenarioHistory['status']

const NUMBER_CELL = 'text-right tabular-nums'
const HEADS = ['Jobs', 'Salary', 'Full cost', 'E&G']

export type ResultRow = {
  key: string
  label: string
  scope: string
  result: RuleResult
}

function SavingsCells({ savings }: { savings: Savings }) {
  return (
    <>
      <TableCell className={NUMBER_CELL}>{formatCount(savings.jobs)}</TableCell>
      <TableCell className={NUMBER_CELL}>
        {formatDollars(savings.salaryCents)}
      </TableCell>
      <TableCell className={NUMBER_CELL}>
        {formatOrBlank(savings.fullCostCents, formatDollars)}
      </TableCell>
      <TableCell className={NUMBER_CELL}>
        {formatDollars(savings.egCents)}
      </TableCell>
    </>
  )
}

const PENDING_TEXT: Record<Exclude<HistoryStatus, 'ready'>, string> = {
  idle: 'No past censuses',
  loading: 'Loading past censuses',
  error: 'Past censuses not loaded',
}

function ResultCells({
  result,
  historyStatus,
}: {
  result: RuleResult
  historyStatus: HistoryStatus
}) {
  if (result.kind === 'census') return <SavingsCells savings={result.savings} />
  const [first] = result.byYear
  if (historyStatus !== 'ready' || !first) {
    return (
      <TableCell colSpan={HEADS.length}>
        {historyStatus === 'ready'
          ? 'No projected year'
          : PENDING_TEXT[historyStatus]}
      </TableCell>
    )
  }
  return <SavingsCells savings={first} />
}

/** Each rule's savings in stack order, and the census rules' total; a freeze shows its first projected year. */
export function ScenarioResultsTable({
  rows,
  total,
  firstYear,
  historyStatus,
  reductionTargetCents,
}: {
  rows: ResultRow[]
  total: Savings
  firstYear: number
  historyStatus: HistoryStatus
  reductionTargetCents: number
}) {
  return (
    <div className="space-y-2">
      <Table>
        <caption className="sr-only">
          Savings by rule in stack order, and the census rules' total
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Rule</TableHead>
            {HEADS.map((head) => (
              <TableHead key={head} scope="col" className="text-right">
                {head}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ key, label, scope, result }, index) => (
            <TableRow key={key}>
              <TableHead scope="row" className="font-normal whitespace-normal">
                {index + 1}. {label}
                {result.kind === 'freeze' &&
                  `, positions and savings in ${fiscalYearLabel(firstYear)}`}
                {result.kind === 'freeze' &&
                  historyStatus === 'ready' &&
                  `, at ${toPercent(result.rateBasisPoints)}% turnover a year`}
                <span className="block text-muted-foreground">{scope}</span>
                {result.kind === 'census' && (
                  <span className="block text-muted-foreground">
                    {smallReachNote(result.savings.jobs)}
                  </span>
                )}
              </TableHead>
              <ResultCells result={result} historyStatus={historyStatus} />
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableHead scope="row">Census rules</TableHead>
            <SavingsCells savings={total} />
          </TableRow>
        </TableFooter>
      </Table>
      <p className="text-sm text-muted-foreground">
        The total counts the census rules once a year. Freezes are not in it:
        their savings change year by year and are counted in the outlook below.
      </p>
      <p className="text-sm">
        The census rules' E&G savings are{' '}
        {formatShare(total.egCents, reductionTargetCents)} of the Board's{' '}
        {formatDollars(reductionTargetCents)} a year reduction estimate. That
        estimate is close to the projected gap's present value, not the gap in
        any one year.
      </p>
    </div>
  )
}

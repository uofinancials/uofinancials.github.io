import { SelectField } from '@/components/select-field'
import { SeriesChart } from '@/components/series-chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ScenarioHistory } from '@/components/use-scenario-history'
import { fiscalYearLabel } from '@/data/budget'
import {
  formatCompactDollars,
  formatDollars,
  formatOrBlank,
  formatWeeks,
} from '@/lib/format'
import {
  type Baseline,
  firstShortfallYear,
  type OutlookRow,
  scenarioSeries,
} from '@/lib/scenario-outlook'
import { NUMBER_CELL } from '@/lib/utils'

const HEADS = [
  'Savings',
  'Run rate',
  'Run rate with savings',
  'Fund balance with savings',
  'Weeks of expenses',
]

function OutlookTable({ rows }: { rows: OutlookRow[] }) {
  return (
    <Table>
      <caption className="sr-only">
        E&G savings, run rate, and fund balance with savings by fiscal year
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Fiscal year</TableHead>
          {HEADS.map((head) => (
            <TableHead key={head} scope="col" className="text-right">
              {head}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.fiscalYear}>
            <TableHead scope="row" className="font-normal">
              {fiscalYearLabel(row.fiscalYear)}
            </TableHead>
            {[
              row.savingsCents,
              row.runRateCents,
              row.remainingRunRateCents,
              row.remainingFundBalanceCents,
            ].map((cents, index) => (
              <TableCell key={HEADS[index]} className={NUMBER_CELL}>
                {formatDollars(cents)}
              </TableCell>
            ))}
            <TableCell className={NUMBER_CELL}>
              {formatOrBlank(row.remainingWeeks, formatWeeks)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function balanceSentence(rows: OutlookRow[]): string {
  const shortfall = firstShortfallYear(rows)
  const last = rows.at(-1)
  if (shortfall !== null) {
    return `With these savings, the fund balance first falls below zero in ${fiscalYearLabel(shortfall)}.`
  }
  return last
    ? `With these savings, the fund balance stays at or above zero through ${fiscalYearLabel(last.fiscalYear)}.`
    : ''
}

function HistoryNotice({ status }: { status: ScenarioHistory['status'] }) {
  if (status === 'loading') {
    return <p>Loading past censuses for the hiring freeze.</p>
  }
  return (
    <p role="alert">
      The past censuses could not be loaded, so the freeze cannot be counted.
    </p>
  )
}

/** The scenario's E&G savings set against the chosen baseline, year by year. */
export function ScenarioOutlookSection({
  rows,
  baselines,
  baseline,
  historyStatus,
  onSelectBaseline,
}: {
  rows: OutlookRow[]
  baselines: Baseline[]
  baseline: Baseline
  historyStatus: ScenarioHistory['status']
  onSelectBaseline: (label: string) => void
}) {
  const isWaiting = historyStatus === 'loading' || historyStatus === 'error'
  return (
    <div className="space-y-4">
      <SelectField
        label="Set against"
        value={baseline.label}
        options={baselines.map(({ label }) => [label, label])}
        onSelect={onSelectBaseline}
      />
      {isWaiting ? (
        <HistoryNotice status={historyStatus} />
      ) : (
        <>
          <p>{balanceSentence(rows)}</p>
          <SeriesChart
            {...scenarioSeries(rows)}
            format={formatDollars}
            formatAxis={formatCompactDollars}
            label="E&G run rate and fund balance by fiscal year, published and with the scenario's savings"
          />
          <OutlookTable rows={rows} />
          {baseline.expenseCents === null && (
            <p className="text-sm text-muted-foreground">
              Weeks of expenses are not computed for this case: its expenses are
              not published.
            </p>
          )}
        </>
      )}
    </div>
  )
}

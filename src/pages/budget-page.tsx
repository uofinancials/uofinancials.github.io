import { useSuspenseQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { OutlookCasesTable } from '@/components/outlook-cases-table'
import { OutlookLinesTable } from '@/components/outlook-lines-table'
import { SeriesChart } from '@/components/series-chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fiscalYearLabel } from '@/data/budget'
import type { Outlook, OutlookSource } from '@/data/outlook'
import { outlookQuery } from '@/data/queries'
import {
  type GapRow,
  gapRows,
  outlookSeries,
  PROJECTION_NOTE,
} from '@/lib/budget-outlook'
import { formatCompactDollars, formatDollars } from '@/lib/format'

const NUMBER_CELL = 'text-right tabular-nums'
const GAP_HEADS = ['Revenue', 'Expenses', 'Run rate', 'Ending fund balance']

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** A source line; `hasLocation` is false where each item gives its own page. */
function Cited({
  source,
  hasLocation = true,
}: {
  source: OutlookSource
  hasLocation?: boolean
}) {
  return (
    <p className="text-sm text-muted-foreground">
      Source:{' '}
      <a className="underline" href={source.url}>
        {source.document}
      </a>
      {hasLocation && `, ${source.location}`}, retrieved {source.retrievedOn}.
    </p>
  )
}

function ReportedNotes({ rows }: { rows: GapRow[] }) {
  return rows.flatMap(({ fiscalYear, runRateCents, reported }) =>
    reported
      ? [
          <p key={fiscalYear} className="text-sm">
            Reported since the projection: the {fiscalYearLabel(fiscalYear)}{' '}
            {reported.basis} run rate is {formatDollars(reported.runRateCents)},
            against {formatDollars(runRateCents)} projected. Source:{' '}
            <a className="underline" href={reported.source.url}>
              {reported.source.document}
            </a>
            , {reported.source.location}, retrieved{' '}
            {reported.source.retrievedOn}.
          </p>,
        ]
      : [],
  )
}

function GapTable({ rows }: { rows: GapRow[] }) {
  return (
    <Table>
      <caption className="sr-only">
        Projected E&G revenue, expenses, run rate, and ending fund balance by
        fiscal year
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Fiscal year</TableHead>
          {GAP_HEADS.map((head) => (
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
            <TableCell className={NUMBER_CELL}>
              {formatDollars(row.revenueCents)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatDollars(row.expenseCents)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatDollars(row.runRateCents)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatDollars(row.endingFundBalanceCents)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function AllFunds({ allFunds }: { allFunds: Outlook['allFunds'] }) {
  return (
    <>
      <p>
        The deficit is in the E&G fund. The adopted{' '}
        {fiscalYearLabel(allFunds.fiscalYear)} operating budget across all funds
        is {formatDollars(allFunds.totalExpenseCents)}. Of it, the E&G fund
        budgets {formatDollars(allFunds.egExpenseCents)} of expenses against{' '}
        {formatDollars(allFunds.egRevenueCents)} of revenue. The other funds
        budget {formatDollars(allFunds.otherExpenseCents)} against{' '}
        {formatDollars(allFunds.otherRevenueCents)} and are projected to cover
        their costs.
      </p>
      <Cited source={allFunds.source} />
    </>
  )
}

function Actions({ actions }: { actions: Outlook['actions'] }) {
  return (
    <ul className="list-disc space-y-2 pl-6">
      {actions.map(({ date, text, source }) => (
        <li key={`${date} ${source.url}`}>
          <span className="font-medium">{date}:</span> {text} (
          <a className="underline" href={source.url}>
            {source.document}
          </a>
          , retrieved {source.retrievedOn})
        </li>
      ))}
    </ul>
  )
}

export function BudgetPage() {
  const { data: outlook } = useSuspenseQuery(outlookQuery)
  const [projection] = outlook.projections
  if (!projection) return null
  const rows = gapRows(projection, outlook.reportedRunRates)
  const { labels, series } = outlookSeries(projection)
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Budget outlook</h1>
        <p>
          The E&G fund as projected in “{projection.title}”, in the{' '}
          {projection.source.document}.
        </p>
        <p className="text-sm text-muted-foreground">{PROJECTION_NOTE}</p>
      </div>
      <Section title="Projected gap by fiscal year">
        <SeriesChart
          labels={labels}
          series={series}
          format={formatDollars}
          formatAxis={formatCompactDollars}
          label="Projected E&G run rate and ending fund balance by fiscal year"
        />
        <GapTable rows={rows} />
        <ReportedNotes rows={rows} />
        <Cited source={projection.source} />
      </Section>
      <Section title="Every published line">
        <OutlookLinesTable projection={projection} />
        <Cited source={projection.source} />
      </Section>
      <Section title="Alternative cases">
        <OutlookCasesTable projection={projection} />
        <Cited source={projection.casesSource} />
      </Section>
      <Section
        title={`The ${formatCompactDollars(projection.reductionTargetCents)} in reductions`}
      >
        <p>
          The materials estimate the budget reductions needed at{' '}
          {formatDollars(projection.reductionTargetCents)} a year, recurring.
          That is close to the run rate’s present value in the base case,{' '}
          {formatDollars(projection.presentValueCents)}; the discount rate is
          not published. It is not the gap in any one year.
        </p>
        <Cited source={projection.reductionTargetSource} />
      </Section>
      <Section title="All funds">
        <AllFunds allFunds={outlook.allFunds} />
      </Section>
      <Section title="Stated assumptions">
        <ul className="list-disc space-y-2 pl-6">
          {projection.assumptions.map(({ text, location }) => (
            <li key={text}>
              {text} ({location})
            </li>
          ))}
        </ul>
        <Cited source={projection.source} hasLocation={false} />
      </Section>
      <Section title="Announced budget actions">
        <Actions actions={outlook.actions} />
      </Section>
    </div>
  )
}

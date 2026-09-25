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
import type { CitedSource } from '@/data/cited-source'
import type { Outlook, Projection } from '@/data/outlook'
import { outlookQuery } from '@/data/queries'
import { type GapRow, gapRows, outlookSeries } from '@/lib/budget-outlook'
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

/** A source line; the location is left out where each item gives its own page. */
function Cited({
  source: { url, document, location, retrievedOn },
}: {
  source: Omit<CitedSource, 'location'> & { location?: string }
}) {
  return (
    <p className="text-sm text-muted-foreground">
      Source:{' '}
      <a className="underline" href={url}>
        {document}
      </a>
      {location && `, ${location}`}, retrieved {retrievedOn}.
    </p>
  )
}

function ReportedNotes({
  reported,
  projection,
}: {
  reported: Outlook['reportedRunRates']
  projection: Projection
}) {
  return reported.map(({ fiscalYear, runRateCents, basis, source }) => {
    const projected =
      projection.runRateCents[projection.fiscalYears.indexOf(fiscalYear)]
    return (
      <div key={fiscalYear} className="space-y-1">
        <p className="text-sm">
          Reported since the projection: the {fiscalYearLabel(fiscalYear)}{' '}
          {basis} run rate is {formatDollars(runRateCents)}
          {projected !== undefined &&
            `, against ${formatDollars(projected)} projected`}
          .
        </p>
        <Cited source={source} />
      </div>
    )
  })
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
          <span className="font-medium">{date}:</span> {text}
          <Cited source={source} />
        </li>
      ))}
    </ul>
  )
}

export function BudgetPage() {
  const { data: outlook } = useSuspenseQuery(outlookQuery)
  const [projection] = outlook.projections
  const rows = gapRows(projection)
  const { labels, series } = outlookSeries(projection)
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Budget outlook</h1>
        <p>
          The E&G fund as projected in “{projection.title}”, in the{' '}
          {projection.source.document}.
        </p>
        <p className="text-sm text-muted-foreground">
          These are the projection’s figures as published, not this site’s
          estimates. They cover the E&G fund only, the part of the budget funded
          mostly by tuition and state appropriation, and leave out any budget
          action not yet taken.
        </p>
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
        <ReportedNotes
          reported={outlook.reportedRunRates}
          projection={projection}
        />
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
        <Cited
          source={{
            url: projection.source.url,
            document: projection.source.document,
            retrievedOn: projection.source.retrievedOn,
          }}
        />
      </Section>
      <Section title="Announced budget actions">
        <Actions actions={outlook.actions} />
      </Section>
    </div>
  )
}

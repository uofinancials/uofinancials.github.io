import { CitedSourceText } from '@/components/cited-source-text'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fiscalYearLabel } from '@/data/budget'
import { sourceKey } from '@/data/cited-source'
import type { RaiseRate } from '@/lib/scenario'
import { toPercent } from '@/lib/scenario-search'
import { NUMBER_CELL } from '@/lib/utils'

function Sources({ rate }: { rate: RaiseRate }) {
  if (rate.sources.length === 0) {
    return <>The projection's 3% for groups without a settled contract</>
  }
  return (
    <>
      {rate.sources.map((source) => (
        <span key={sourceKey(source)} className="block">
          <CitedSourceText source={source} />
        </span>
      ))}
    </>
  )
}

/** The raise each raise group would get in the first savings year, which savings grow by and a raise freeze forgoes, with its sources. */
export function ScenarioRaiseRatesTable({
  rates,
  firstYear,
}: {
  rates: RaiseRate[]
  firstYear: number
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Savings count the raises the projection spends, and a raise freeze
        forgoes them: in {fiscalYearLabel(firstYear)}, each raise group's cited
        terms, or 3% where none is published.
      </p>
      <Table>
        <caption className="sr-only">
          Raise rates in {fiscalYearLabel(firstYear)}, by raise group
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Raise group</TableHead>
            <TableHead scope="col" className="text-right">
              {fiscalYearLabel(firstYear)} raise
            </TableHead>
            <TableHead scope="col">Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((rate) => (
            <TableRow key={rate.label}>
              <TableHead scope="row" className="font-normal whitespace-normal">
                {rate.label}
              </TableHead>
              <TableCell className={NUMBER_CELL}>
                {toPercent(rate.basisPoints)}%
              </TableCell>
              <TableCell className="whitespace-normal">
                <Sources rate={rate} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground">
        After {fiscalYearLabel(firstYear)}, 3% a year for every group, the
        projection's assumption for its later years.
      </p>
    </div>
  )
}

import { Link } from '@tanstack/react-router'
import { RadioField } from '@/components/radio-field'
import { TotalsChart } from '@/components/totals-chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AreaFigure } from '@/lib/department-table'
import { formatCount, formatDollars, formatOrBlank } from '@/lib/format'
import { areaBars, HOME_MEASURES, type HomeMeasure } from '@/lib/home'
import { NUMBER_CELL } from '@/lib/utils'

const SHOWN_AREAS = 10

/** The largest colleges and VP areas by one measure, as bars and as a table whose names link to each area's page. */
export function AreaBreakdown({
  areas,
  measure,
  labels,
  onMeasure,
}: {
  areas: AreaFigure[]
  measure: HomeMeasure
  /** Each measure's label, naming its year. */
  labels: Record<HomeMeasure, string>
  onMeasure: (measure: HomeMeasure) => void
}) {
  const bars = areaBars(areas, measure, SHOWN_AREAS)
  const format = measure === 'jobs' ? formatCount : formatDollars
  const title = `The ${SHOWN_AREAS} largest colleges and VP areas by ${labels[measure]}`
  return (
    <>
      <RadioField
        legend="Show"
        name="measure"
        value={measure}
        options={HOME_MEASURES.map((option) => [option, labels[option]])}
        onSelect={onMeasure}
      />
      <TotalsChart
        bars={bars.map(({ name, value }) => ({ key: name, value }))}
        valueLabel={labels[measure]}
        format={format}
        label={title}
      />
      <Table>
        <caption className="sr-only">{title}</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Area</TableHead>
            {HOME_MEASURES.map((option) => (
              <TableHead key={option} scope="col" className="text-right">
                {labels[option]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bars.map((area) => (
            <TableRow key={area.code ?? 'unassigned'}>
              <TableHead
                scope="row"
                className="min-w-40 font-normal whitespace-normal"
              >
                {area.code === null ? (
                  area.name
                ) : (
                  <Link
                    className="underline"
                    to="/departments/$code"
                    params={{ code: area.code }}
                  >
                    {area.name}
                  </Link>
                )}
              </TableHead>
              <TableCell className={NUMBER_CELL}>
                {formatOrBlank(area.budgetCents, formatDollars)}
              </TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatOrBlank(area.spendCents, formatDollars)}
              </TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatCount(area.jobs)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

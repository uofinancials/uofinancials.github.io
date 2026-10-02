import { Link } from '@tanstack/react-router'
import { BarCell } from '@/components/charts/bar-cell'
import { RadioField } from '@/components/fields/radio-field'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SIZE_MEASURES, type SizeMeasure } from '@/lib/departments/measures'
import type { AreaFigure } from '@/lib/departments/table'
import { areaBars } from '@/lib/home/home'
import { formatCount, formatDollars, formatOrBlank } from '@/lib/shared/format'
import { shareOfLargest } from '@/lib/shared/series'
import { cn, WRAP_CELL } from '@/lib/utils'

const SHOWN_AREAS = 10

/** The largest colleges and VP areas by one measure, as a table with bars whose names link to each area's page. */
export function AreaBreakdown({
  areas,
  measure,
  labels,
  onMeasure,
}: {
  areas: AreaFigure[]
  measure: SizeMeasure
  /** Each measure's label, naming its year. */
  labels: Record<SizeMeasure, string>
  onMeasure: (measure: SizeMeasure) => void
}) {
  const bars = areaBars(areas, measure, SHOWN_AREAS)
  const shares = shareOfLargest(bars.map(({ value }) => value))
  const shareIn = (column: SizeMeasure, index: number) =>
    column === measure ? shares[index] : undefined
  const title = `The ${SHOWN_AREAS} largest colleges and VP areas by ${labels[measure]}`
  return (
    <>
      <RadioField
        legend="Show"
        name="measure"
        value={measure}
        options={SIZE_MEASURES.map((option) => [option, labels[option]])}
        onSelect={onMeasure}
      />
      <Table>
        <caption className="sr-only">{title}</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Area</TableHead>
            {SIZE_MEASURES.map((option) => (
              <TableHead key={option} scope="col" className="text-right">
                {labels[option]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bars.map((area, index) => (
            <TableRow key={area.code ?? 'unassigned'}>
              <TableHead scope="row" className={cn(WRAP_CELL, 'font-normal')}>
                {area.code === null ? (
                  area.name
                ) : (
                  <Link
                    className="link"
                    to="/departments/$code"
                    params={{ code: area.code }}
                  >
                    {area.name}
                  </Link>
                )}
              </TableHead>
              <BarCell share={shareIn('budget', index)}>
                {formatOrBlank(area.budgetCents, formatDollars)}
              </BarCell>
              <BarCell share={shareIn('spend', index)}>
                {formatOrBlank(area.spendCents, formatDollars)}
              </BarCell>
              <BarCell share={shareIn('jobs', index)}>
                {formatCount(area.jobs)}
              </BarCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

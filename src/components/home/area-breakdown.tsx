import { Link } from '@tanstack/react-router'
import { BarCell } from '@/components/charts/bar-cell'
import { RadioField } from '@/components/fields/radio-field'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AreaFigure } from '@/lib/departments/table'
import { areaBars, HOME_MEASURES, type HomeMeasure } from '@/lib/home/home'
import { formatCount, formatDollars, formatOrBlank } from '@/lib/shared/format'
import { shareOfLargest } from '@/lib/shared/share'
import { NUMBER_CELL } from '@/lib/utils'

const SHOWN_AREAS = 10

const MEASURE_TEXT: Record<HomeMeasure, (area: AreaFigure) => string> = {
  budget: (area) => formatOrBlank(area.budgetCents, formatDollars),
  spend: (area) => formatOrBlank(area.spendCents, formatDollars),
  jobs: (area) => formatCount(area.jobs),
}

/** The chosen measure's cell carries a bar; the others are plain. */
function MeasureCell({
  share,
  children,
}: {
  share: number | undefined
  children: string
}) {
  return share === undefined ? (
    <TableCell className={NUMBER_CELL}>{children}</TableCell>
  ) : (
    <BarCell share={share}>{children}</BarCell>
  )
}

/** The largest colleges and VP areas by one measure, as a table with bars whose names link to each area's page. */
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
  const shares = shareOfLargest(bars.map(({ value }) => value))
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
          {bars.map((area, index) => (
            <TableRow key={area.code ?? 'unassigned'}>
              <TableHead
                scope="row"
                className="min-w-40 font-normal whitespace-normal"
              >
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
              {HOME_MEASURES.map((option) => (
                <MeasureCell
                  key={option}
                  share={option === measure ? shares[index] : undefined}
                >
                  {MEASURE_TEXT[option](area)}
                </MeasureCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { ChartMarker } from '@/lib/budget/outlook'
import { MIN_LINE_POINTS } from '@/lib/shared/format'
import { cn } from '@/lib/utils'
import { lineColor } from './line-color'

const LINE_DASHES = ['', '6 3', '2 3', '10 3 2 3']
const AXIS_WIDTH_PX = 64
const AXIS_PADDING = { left: 16, right: 16 }
const MARKER_DASH = '4 4'

type ChartSeries = {
  key: string
  values: (number | null)[]
  /** Drawn thin and grey, as the reference the colored lines are read against. */
  isBaseline?: boolean
}

/** A line's color and dash, fixed by its place among all the view's lines so hiding one does not restyle the rest. */
function lineStyle({ isBaseline }: ChartSeries, index: number) {
  const strokeDasharray = LINE_DASHES[index % LINE_DASHES.length]
  return isBaseline
    ? {
        stroke: 'var(--muted-foreground)',
        strokeDasharray,
        strokeWidth: 1.5,
        dot: false,
      }
    : {
        stroke: lineColor(index),
        strokeDasharray,
        strokeWidth: 2,
        dot: { r: 3 },
      }
}

/** One line per series over the x labels, with zero marked when a line goes below it; the table beside it carries the numbers. Draws nothing for fewer than two labels. */
export function SeriesChart({
  labels,
  series,
  hidden = [],
  format,
  formatAxis,
  label,
  marker,
  hasLegend = true,
  className,
}: {
  labels: string[]
  series: ChartSeries[]
  hidden?: string[]
  format: (value: number) => string
  formatAxis: (value: number) => string
  label: string
  /** A dashed vertical line at one x label, with its text. */
  marker?: ChartMarker
  hasLegend?: boolean
  /** Overrides the chart's height classes. */
  className?: string
}) {
  if (labels.length < MIN_LINE_POINTS) return null
  const shown = series.filter(({ key }) => !hidden.includes(key))
  const isBelowZero = shown.some(({ values }) =>
    values.some((value) => value !== null && value < 0),
  )
  const data = labels.map((x, index) => ({
    x,
    values: Object.fromEntries(
      series.map(({ key, values }) => [key, values[index] ?? null]),
    ),
  }))
  return (
    <figure aria-label={label}>
      <ChartContainer
        config={{}}
        className={cn('aspect-auto h-96 w-full', className)}
      >
        <LineChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          {isBelowZero && (
            <ReferenceArea y1={0} fill="var(--muted)" fillOpacity={1} />
          )}
          <XAxis dataKey="x" tickLine={false} padding={AXIS_PADDING} />
          <YAxis
            width={AXIS_WIDTH_PX}
            tickLine={false}
            tickFormatter={(value) => formatAxis(Number(value))}
          />
          {isBelowZero && (
            <ReferenceLine y={0} stroke="var(--foreground)" strokeWidth={1.5} />
          )}
          {marker && (
            <ReferenceLine
              x={marker.x}
              stroke="var(--foreground)"
              strokeDasharray={MARKER_DASH}
              label={{
                value: marker.label,
                position: 'insideBottomRight',
                fill: 'var(--foreground)',
                fontSize: 12,
              }}
            />
          )}
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => `${name}: ${format(Number(value))}`}
              />
            }
          />
          {hasLegend && <Legend itemSorter={null} />}
          {series.map((line, index) =>
            hidden.includes(line.key) ? null : (
              <Line
                key={line.key}
                name={line.key}
                dataKey={(row: (typeof data)[number]) => row.values[line.key]}
                {...lineStyle(line, index)}
                type="linear"
                isAnimationActive={false}
              />
            ),
          )}
        </LineChart>
      </ChartContainer>
    </figure>
  )
}

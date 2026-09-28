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
import {
  type ChartMarker,
  isAnyBelowZero,
  sparseNote,
} from '@/lib/shared/series'
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

/** Recharts resolves a string data key as a path, and series keys are data, so each series gets a positional field. */
function seriesKey(index: number) {
  return `series${index}`
}

/** One row per x label, each series' value under its positional key. */
function chartRows(labels: string[], series: ChartSeries[]) {
  return labels.map((x, index) => ({
    x,
    ...Object.fromEntries(
      series.map(({ values }, position) => [
        seriesKey(position),
        values[index] ?? null,
      ]),
    ),
  }))
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

/** One line per series over the x labels, with zero marked when a line goes below it; the table beside it carries the numbers. Below two valued labels it says so in a sentence instead. */
export function SeriesChart({
  labels,
  series,
  hidden = [],
  format,
  formatAxis,
  label,
  marker,
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
  /** Overrides the chart's height classes. */
  className?: string
}) {
  const shown = series
    .map((line, index) => ({ line, dataKey: seriesKey(index), index }))
    .filter(({ line }) => !hidden.includes(line.key))
  const note = sparseNote(
    labels,
    shown.map(({ line }) => line.values),
  )
  if (note !== null) {
    return <p className="text-sm text-muted-foreground">{note}</p>
  }
  const isBelowZero = isAnyBelowZero(shown.map(({ line }) => line.values))
  const data = chartRows(labels, series)
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
          {shown.length > 1 && <Legend itemSorter={null} />}
          {shown.map(({ line, dataKey, index }) => (
            <Line
              key={line.key}
              name={line.key}
              dataKey={dataKey}
              {...lineStyle(line, index)}
              type="linear"
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </figure>
  )
}

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import {
  BelowZeroBand,
  chartRows,
  legendText,
  markerLine,
  seriesKey,
} from './chart-parts'
import { lineColor } from './line-color'

const LINE_DASHES = ['', '6 3', '2 3', '10 3 2 3']
const AXIS_WIDTH_PX = 64
const Y_TICK_COUNT = 5
const AXIS_PADDING = { left: 16, right: 16 }

type ChartSeries = {
  key: string
  values: (number | null)[]
  /** Drawn thin and grey, as the reference the colored lines are read against. */
  isBaseline?: boolean
  /** The palette place for its color and dash; defaults to its index, so a measure drawn on several charts can keep one look. */
  slot?: number
}

/** A line's color and dash, fixed by its place among all the view's lines so hiding one does not restyle the rest. */
function lineStyle({ isBaseline, slot }: ChartSeries, index: number) {
  const place = slot ?? index
  const strokeDasharray = LINE_DASHES[place % LINE_DASHES.length]
  return isBaseline
    ? {
        stroke: 'var(--muted-foreground)',
        strokeDasharray,
        strokeWidth: 1.5,
        dot: false,
      }
    : {
        stroke: lineColor(place),
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
          {isBelowZero && <BelowZeroBand />}
          <XAxis
            dataKey="x"
            tickLine={false}
            padding={AXIS_PADDING}
            interval="preserveStartEnd"
          />
          <YAxis
            width={AXIS_WIDTH_PX}
            tickLine={false}
            tickCount={Y_TICK_COUNT}
            domain={[(dataMin: number) => Math.min(0, dataMin), 'auto']}
            tickFormatter={(value) => formatAxis(Number(value))}
          />
          {isBelowZero && (
            <ReferenceLine y={0} stroke="var(--foreground)" strokeWidth={1.5} />
          )}
          {marker && markerLine(marker)}
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => `${name}: ${format(Number(value))}`}
              />
            }
          />
          {shown.length > 1 && (
            <Legend itemSorter={null} formatter={legendText} />
          )}
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

import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { lineColor } from './line-color'

const LINE_DASHES = ['', '6 3', '2 3', '10 3 2 3']
const AXIS_WIDTH_PX = 64
const AXIS_PADDING = { left: 16, right: 16 }

type ChartSeries = { key: string; values: (number | null)[] }

/** A line's color and dash, fixed by its place among all the view's lines so hiding one does not restyle the rest. */
function lineStyle(index: number) {
  return {
    stroke: lineColor(index),
    strokeDasharray: LINE_DASHES[index % LINE_DASHES.length],
  }
}

/** One line per series over the x labels; the table beside it carries the numbers. */
export function SeriesChart({
  labels,
  series,
  hidden = [],
  format,
  formatAxis,
  label,
  className,
}: {
  labels: string[]
  series: ChartSeries[]
  hidden?: string[]
  format: (value: number) => string
  formatAxis: (value: number) => string
  label: string
  /** Overrides the chart's height classes. */
  className?: string
}) {
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
          <XAxis dataKey="x" tickLine={false} padding={AXIS_PADDING} />
          <YAxis
            width={AXIS_WIDTH_PX}
            tickLine={false}
            tickFormatter={(value) => formatAxis(Number(value))}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => `${name}: ${format(Number(value))}`}
              />
            }
          />
          <Legend itemSorter={null} />
          {series.map(({ key }, index) =>
            hidden.includes(key) ? null : (
              <Line
                key={key}
                name={key}
                dataKey={(row: (typeof data)[number]) => row.values[key]}
                {...lineStyle(index)}
                strokeWidth={2}
                dot={{ r: 3 }}
                type="linear"
              />
            ),
          )}
        </LineChart>
      </ChartContainer>
    </figure>
  )
}

import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { TrendSeries } from '@/lib/trends'
import { METRIC_INFO, type TrendMetric } from '@/lib/trends-search'

const LINE_COLORS = 8
const LINE_DASHES = ['', '6 3', '2 3', '10 3 2 3']
const AXIS_WIDTH_PX = 64

/** A line's color and dash, fixed by its place among all the view's lines so hiding one does not restyle the rest. */
export function lineStyle(index: number) {
  return {
    stroke: `var(--line-${(index % LINE_COLORS) + 1})`,
    strokeDasharray: LINE_DASHES[index % LINE_DASHES.length],
  }
}

/** One line per series over the censuses; the table beside it carries the numbers. */
export function TrendsChart({
  series,
  hidden,
  metric,
  label,
}: {
  series: TrendSeries[]
  hidden: string[]
  metric: TrendMetric
  label: string
}) {
  const { pick, format, formatAxis } = METRIC_INFO[metric]
  const years = series[0]?.points.map((point) => point.year) ?? []
  const data = years.map((year, index) => ({
    year,
    values: Object.fromEntries(
      series.map(({ key, points }) => {
        const point = points[index]
        return [key, point ? pick(point) : null]
      }),
    ),
  }))
  return (
    <figure aria-label={label}>
      <ChartContainer config={{}} className="aspect-auto h-96 w-full">
        <LineChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="year" tickLine={false} />
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

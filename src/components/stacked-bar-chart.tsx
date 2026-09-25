import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { formatCount } from '@/lib/format'
import { lineColor } from './line-color'

const STACK = 'stack'
const AXIS_WIDTH_PX = 48

/** Recharts stacks only bars keyed by field name, and series keys are data, so each stack gets a positional field. */
function stackKey(index: number) {
  return `stack${index}`
}

/** Bars stacked by series in legend order, one column per label; the table beside it carries the numbers. */
export function StackedBarChart({
  labels,
  series,
  label,
}: {
  labels: string[]
  /** `position` fixes a series' color, so filtering one out does not recolor the rest. */
  series: { key: string; values: number[]; position: number }[]
  label: string
}) {
  const data = labels.map((x, index) => ({
    x,
    ...Object.fromEntries(
      series.map(({ values }, stack) => [stackKey(stack), values[index] ?? 0]),
    ),
  }))
  return (
    <figure aria-label={label}>
      <ChartContainer config={{}} className="aspect-auto h-96 w-full">
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="x" tickLine={false} interval="preserveStartEnd" />
          <YAxis
            width={AXIS_WIDTH_PX}
            tickLine={false}
            allowDecimals={false}
            tickFormatter={(value) => formatCount(Number(value))}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) =>
                  `${name}: ${formatCount(Number(value))}`
                }
              />
            }
          />
          <Legend itemSorter={null} />
          {series.map(({ key, position }, index) => (
            <Bar
              key={key}
              name={key}
              dataKey={stackKey(index)}
              stackId={STACK}
              fill={lineColor(position)}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </figure>
  )
}

import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

const VALUE = 'value'

const BAR_HEIGHT_PX = 28
const AXIS_PADDING_PX = 16
const LABEL_WIDTH_PX = 200

/** One value per group as horizontal bars; the table beside it carries the numbers. */
export function TotalsChart({
  bars,
  valueLabel,
  format,
  label,
}: {
  bars: { key: string; value: number }[]
  valueLabel: string
  format: (value: number) => string
  label: string
}) {
  const config = {
    [VALUE]: { label: valueLabel, color: 'var(--chart-3)' },
  } satisfies ChartConfig
  return (
    <figure aria-label={label}>
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height: bars.length * BAR_HEIGHT_PX + AXIS_PADDING_PX }}
      >
        <BarChart data={bars} layout="vertical" accessibilityLayer>
          <XAxis type="number" dataKey={VALUE} hide />
          <YAxis
            type="category"
            dataKey="key"
            width={LABEL_WIDTH_PX}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => format(Number(value))}
              />
            }
          />
          <Bar dataKey={VALUE} fill={`var(--color-${VALUE})`} radius={4} />
        </BarChart>
      </ChartContainer>
    </figure>
  )
}

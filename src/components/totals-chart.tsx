import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { formatDollars } from '@/lib/format'
import type { GroupTotals } from '@/lib/overview'

const CHART_CONFIG = {
  spendCents: { label: 'Salary spend', color: 'var(--chart-3)' },
} satisfies ChartConfig

const BAR_HEIGHT_PX = 28
const AXIS_PADDING_PX = 16
const LABEL_WIDTH_PX = 200

/** Salary spend by group as horizontal bars; the table beside it carries the numbers. */
export function TotalsChart({
  groups,
  label,
}: {
  groups: GroupTotals[]
  label: string
}) {
  const data = groups.map(({ key, totals }) => ({
    key,
    spendCents: totals.spendCents,
  }))
  return (
    <figure aria-label={label}>
      <ChartContainer
        config={CHART_CONFIG}
        className="aspect-auto w-full"
        style={{ height: groups.length * BAR_HEIGHT_PX + AXIS_PADDING_PX }}
      >
        <BarChart data={data} layout="vertical" accessibilityLayer>
          <XAxis type="number" dataKey="spendCents" hide />
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
                formatter={(value) => formatDollars(Number(value))}
              />
            }
          />
          <Bar
            dataKey="spendCents"
            fill="var(--color-spendCents)"
            radius={4}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </figure>
  )
}

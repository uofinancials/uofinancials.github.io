import { useState } from 'react'
import {
  CartesianGrid,
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
import { formatIndex } from '@/lib/shared/format'
import { type ChartMarker, sparseNote } from '@/lib/shared/series'
import { INDEX_BASE, type IndexedLine } from '@/lib/trends/report'
import { cn } from '@/lib/utils'
import { chartRows, MarkerLine, seriesKey } from './chart-parts'
import { EndLabels } from './end-labels'
import { lineColor } from './line-color'

const AXIS_WIDTH_PX = 48
const AXIS_PADDING = { left: 16, right: 16 }
const END_LABELS_WIDTH_PX = 210
const BASELINE_DASH = '4 4'
const HIT_WIDTH_PX = 14
const DIMMED = 0.2

type Shown = { line: IndexedLine; dataKey: string; index: number }

function strokeOf({ isBaseline }: IndexedLine, index: number) {
  return isBaseline ? 'var(--muted-foreground)' : lineColor(index)
}

function endLabelsOf(shown: Shown[]) {
  return shown.flatMap(({ line, index }) => {
    const value = line.values.findLast((point) => point !== null)
    return value === undefined || value === null
      ? []
      : [{ key: line.key, value, stroke: strokeOf(line, index) }]
  })
}

/** The lines as drawn: the active one thick, the others dimmed while one is active. */
function drawnLines(shown: Shown[], active: string | null) {
  return shown.map(({ line, dataKey, index }) => (
    <Line
      key={line.key}
      name={line.key}
      dataKey={dataKey}
      type="linear"
      stroke={strokeOf(line, index)}
      strokeDasharray={line.isBaseline ? BASELINE_DASH : undefined}
      strokeWidth={line.key === active ? 3 : 1.75}
      strokeOpacity={active === null || line.key === active ? 1 : DIMMED}
      dot={false}
      activeDot={{ r: 3 }}
      isAnimationActive={false}
    />
  ))
}

/** A wide transparent copy of each line, so a thin line is easy to point at; left out of the tooltip. */
function hitLines(shown: Shown[], onActive: (key: string) => void) {
  return shown.map(({ line, dataKey }) => (
    <Line
      key={`${line.key} hit`}
      dataKey={dataKey}
      stroke="transparent"
      strokeWidth={HIT_WIDTH_PX}
      dot={false}
      activeDot={false}
      tooltipType="none"
      legendType="none"
      isAnimationActive={false}
      onMouseEnter={() => onActive(line.key)}
    />
  ))
}

/**
 * Lines indexed to 100, named at their ends rather than in a legend, solid
 * and without dots. Pointing at a line or its name brings it forward, dims the
 * rest, and bolds it in the tooltip; a line keeps its color by its place among
 * all the lines, so hiding one does not restyle the rest.
 */
export function IndexChart({
  labels,
  lines,
  hidden = [],
  label,
  marker,
}: {
  labels: string[]
  lines: IndexedLine[]
  hidden?: string[]
  label: string
  marker?: ChartMarker
}) {
  const [active, setActive] = useState<string | null>(null)
  const shown = lines
    .map((line, index) => ({ line, dataKey: seriesKey(index), index }))
    .filter(({ line }) => !hidden.includes(line.key))
    .sort(
      (a, b) => Number(a.line.key === active) - Number(b.line.key === active),
    )
  const note = sparseNote(
    labels,
    shown.map(({ line }) => line.values),
  )
  if (note !== null) {
    return <p className="text-sm text-muted-foreground">{note}</p>
  }
  return (
    <figure aria-label={label}>
      <ChartContainer config={{}} className="aspect-auto h-96 w-full">
        <LineChart
          data={chartRows(labels, lines)}
          margin={{ right: END_LABELS_WIDTH_PX }}
          onMouseLeave={() => setActive(null)}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="x" tickLine={false} padding={AXIS_PADDING} />
          <YAxis
            width={AXIS_WIDTH_PX}
            domain={['auto', 'auto']}
            tickLine={false}
            tickFormatter={(value) => formatIndex(Number(value))}
          />
          <ReferenceLine y={INDEX_BASE} stroke="var(--foreground)" />
          {marker && <MarkerLine marker={marker} />}
          <ChartTooltip
            itemSorter={(item) => -Number(item.value)}
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span
                    className={cn(
                      name === active && 'font-semibold text-foreground',
                    )}
                  >
                    {name}: {formatIndex(Number(value))}
                  </span>
                )}
              />
            }
          />
          <EndLabels
            labels={endLabelsOf(shown)}
            format={formatIndex}
            active={active}
          />
          {drawnLines(shown, active)}
          {hitLines(shown, setActive)}
        </LineChart>
      </ChartContainer>
    </figure>
  )
}

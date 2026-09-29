import { ReferenceLine, usePlotArea, useYAxisScale } from 'recharts'
import type { ChartMarker } from '@/lib/shared/series'

const MARKER_DASH = '4 4'

/** Recharts resolves a string data key as a path, and series keys are data, so each series gets a positional field. */
export function seriesKey(index: number) {
  return `series${index}`
}

/** One row per x label, each series' value under its positional key. */
export function chartRows(
  labels: string[],
  series: { values: (number | null)[] }[],
) {
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

/** A dashed vertical line at one x label, with its text. */
export function markerLine(marker: ChartMarker) {
  return (
    <ReferenceLine
      x={marker.x}
      stroke="var(--foreground)"
      strokeDasharray={MARKER_DASH}
      label={{
        value: marker.label,
        position: 'insideTopRight',
        fill: 'var(--foreground)',
        fontSize: 12,
      }}
    />
  )
}

/** A legend entry's text in the text color; its swatch keeps the series color. */
export function legendText(value: string) {
  return <span className="text-foreground">{value}</span>
}

/** Tints the plot below zero across its full width, not only between the first and last points. */
export function BelowZeroBand() {
  const plot = usePlotArea()
  const yScale = useYAxisScale()
  const zero = yScale?.(0)
  if (!plot || zero === undefined) return null
  const bottom = plot.y + plot.height
  return (
    <rect
      x={plot.x}
      y={zero}
      width={plot.width}
      height={Math.max(0, bottom - zero)}
      fill="var(--muted)"
    />
  )
}

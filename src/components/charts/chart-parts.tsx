import { ReferenceLine } from 'recharts'
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
        position: 'insideBottomRight',
        fill: 'var(--foreground)',
        fontSize: 12,
      }}
    />
  )
}

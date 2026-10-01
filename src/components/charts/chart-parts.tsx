import {
  ReferenceLine,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
} from 'recharts'
import { type ChartMarker, markerLabelPlacement } from '@/lib/shared/series'

const MARKER_DASH = '4 4'
const MARKER_FONT_SIZE = '12px'
const MARKER_OFFSET_PX = 5
// ponytail: a fixed minimum stands in for measuring the label; measure it if a marker's words outgrow this.
const MARKER_MIN_ROOM_PX = 96
// The words can be measured before the web font loads; this covers a fallback font up to 15% narrower.
const MARKER_WRAP_SLACK = 0.85

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

/** A dashed vertical line at one x label; its text runs left from the line's top, or right where the left is too narrow, and wraps to stay inside the plot. */
export function MarkerLine({ marker }: { marker: ChartMarker }) {
  const plot = usePlotArea()
  const lineX = useXAxisScale()?.(marker.x)
  if (!plot || lineX === undefined) return null
  const { side, room } = markerLabelPlacement({
    lineX,
    plotLeft: plot.x,
    plotRight: plot.x + plot.width,
    minRoom: MARKER_MIN_ROOM_PX,
  })
  return (
    <ReferenceLine
      x={marker.x}
      stroke="var(--foreground)"
      strokeDasharray={MARKER_DASH}
      label={{
        value: marker.label,
        position: side === 'left' ? 'insideTopRight' : 'insideTopLeft',
        offset: MARKER_OFFSET_PX,
        width: (room - MARKER_OFFSET_PX) * MARKER_WRAP_SLACK,
        fill: 'var(--foreground)',
        // Recharts measures the words to wrap with `style`, which needs the unit, not with the `fontSize` attribute.
        style: { fontSize: MARKER_FONT_SIZE },
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

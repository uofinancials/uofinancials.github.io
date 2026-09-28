import { usePlotArea, useYAxisScale } from 'recharts'
import { spreadLabels } from '@/lib/shared/series'

const GAP_PX = 16
const SWATCH_PX = 12
const OFFSET_PX = 8
const FONT_PX = 12
const DIMMED = 0.35

export type EndLabel = { key: string; value: number; stroke: string }

/** Each line's name and last value right of the plot, at its value's height, spread so no two overlap; the swatch is the line's color and the text stays in the foreground color. */
export function EndLabels({
  labels,
  format,
  active = null,
}: {
  labels: EndLabel[]
  format: (value: number) => string
  /** The line pointed at; its label is bold and the others dimmed. */
  active?: string | null
}) {
  const yScale = useYAxisScale()
  const plot = usePlotArea()
  if (!yScale || !plot) return null
  const ys = spreadLabels(
    labels.map(({ value }) => yScale(value) ?? plot.y),
    GAP_PX,
    [plot.y, plot.y + plot.height],
  )
  const x = plot.x + plot.width + OFFSET_PX
  return (
    <g aria-hidden fontSize={FONT_PX}>
      {labels.map(({ key, value, stroke }, index) => {
        const y = ys[index] ?? plot.y
        return (
          <g
            key={key}
            opacity={active === null || active === key ? 1 : DIMMED}
            fontWeight={active === key ? 600 : undefined}
          >
            <line
              x1={x}
              x2={x + SWATCH_PX}
              y1={y}
              y2={y}
              stroke={stroke}
              strokeWidth={3}
            />
            <text
              x={x + SWATCH_PX + OFFSET_PX / 2}
              y={y}
              dominantBaseline="middle"
              fill="var(--foreground)"
            >
              {key} {format(value)}
            </text>
          </g>
        )
      })}
    </g>
  )
}

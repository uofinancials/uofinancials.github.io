import { formatIndex } from '@/lib/shared/format'
import { INDEX_BASE, type IndexedLine } from '@/lib/trends/report'
import { RankedBars } from './ranked-bars'
import { SeriesChart } from './series-chart'

/** Lines indexed to their first value, named at their ends, and on a phone each line's change as ranked bars instead. */
export function IndexFigure({
  labels,
  lines,
  hidden,
  changes,
  label,
  barsLabel,
  marker,
}: {
  labels: string[]
  lines: IndexedLine[]
  hidden?: string[]
  changes: { key: string; change: number | null }[]
  label: string
  barsLabel: string
  marker?: { x: string; label: string }
}) {
  return (
    <>
      <RankedBars items={changes} label={barsLabel} className="md:hidden" />
      <div className="hidden md:block">
        <SeriesChart
          labels={labels}
          series={lines}
          hidden={hidden}
          format={formatIndex}
          formatAxis={formatIndex}
          label={label}
          marker={marker}
          referenceY={INDEX_BASE}
          hasEndLabels
          isZeroBased={false}
        />
      </div>
    </>
  )
}

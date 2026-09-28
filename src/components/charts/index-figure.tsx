import type { ChartMarker } from '@/lib/shared/series'
import type { IndexedLine } from '@/lib/trends/report'
import type { GrowthView } from '@/lib/trends/search'
import { IndexChart } from './index-chart'
import { RankedBars } from './ranked-bars'

/** Each line's change as ranked bars, or the lines over time as an index chart; a phone always shows the bars. */
export function IndexFigure({
  view,
  labels,
  lines,
  hidden,
  changes,
  emphasis,
  label,
  barsLabel,
  marker,
}: {
  view: GrowthView
  labels: string[]
  lines: IndexedLine[]
  hidden?: string[]
  changes: { key: string; change: number | null }[]
  /** The bar drawn as the reference the others are read against. */
  emphasis?: string
  label: string
  barsLabel: string
  marker?: ChartMarker
}) {
  const bars = (
    <RankedBars items={changes} emphasis={emphasis} label={barsLabel} />
  )
  if (view === 'bars') return bars
  return (
    <>
      <div className="md:hidden">{bars}</div>
      <div className="hidden md:block">
        <IndexChart
          labels={labels}
          lines={lines}
          hidden={hidden}
          label={label}
          marker={marker}
        />
      </div>
    </>
  )
}

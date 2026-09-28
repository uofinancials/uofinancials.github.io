import { sparseNote } from '@/lib/shared/format'
import { SeriesChart } from './series-chart'

/** One small line chart per series, each on its own axis from zero; a series with fewer than two values gets a sentence instead. */
export function SmallMultiples({
  labels,
  series,
  format,
  formatAxis,
  label,
}: {
  labels: string[]
  series: { key: string; values: (number | null)[] }[]
  format: (value: number) => string
  formatAxis: (value: number) => string
  label: string
}) {
  return (
    <figure
      aria-label={label}
      className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {series.map((line) => {
        const note = sparseNote(labels, line.values)
        return (
          <div key={line.key}>
            <p className="text-sm font-medium">{line.key}</p>
            {note === null ? (
              <SeriesChart
                labels={labels}
                series={[line]}
                format={format}
                formatAxis={formatAxis}
                label={line.key}
                hasLegend={false}
                className="h-40"
              />
            ) : (
              <p className="text-sm text-muted-foreground">{note}</p>
            )}
          </div>
        )
      })}
    </figure>
  )
}

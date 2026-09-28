import { SeriesChart } from './series-chart'

/** One small line chart per series, each on its own axis from zero. */
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
      {series.map((line) => (
        <div key={line.key}>
          <p className="text-sm font-medium">{line.key}</p>
          <SeriesChart
            labels={labels}
            series={[line]}
            format={format}
            formatAxis={formatAxis}
            label={line.key}
            className="h-40"
          />
        </div>
      ))}
    </figure>
  )
}

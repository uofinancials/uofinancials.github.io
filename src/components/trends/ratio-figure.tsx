import { SeriesChart } from '@/components/charts/series-chart'
import { SUMMARY_CLASS } from '@/components/layout/disclosure-class'
import { formatCount, formatOrBlank, formatRatio } from '@/lib/shared/format'
import { RATIO_COLUMNS, type RatioRow } from '@/lib/trends/report'
import { ratioAnswer } from '@/lib/trends/report-text'
import { GroupTable } from './group-table'

const TITLE = 'Admins and executives per 100 faculty jobs'

/** The staffing ratio in each census, as a line and a table of the jobs it counts. */
export function RatioFigure({ rows }: { rows: RatioRow[] }) {
  const ratios = rows.map(({ ratio }) => ratio)
  const from = rows[0]?.year ?? 0
  const to = rows.at(-1)?.year ?? 0
  return (
    <div className="space-y-3">
      <h3 className="font-medium">{TITLE}</h3>
      <p>{ratioAnswer(ratios, { from, to })}</p>
      <SeriesChart
        labels={rows.map(({ year }) => String(year))}
        series={[{ key: TITLE, values: ratios }]}
        format={formatRatio}
        formatAxis={formatRatio}
        label={`${TITLE}, Fall ${from} to Fall ${to}`}
        className="h-48"
      />
      <p className="text-sm text-muted-foreground">
        Counted from the published EEO categories, so it moves when they do: the
        jump in 2018 is the year UO restructured them.
      </p>
      <details className="text-sm">
        <summary className={SUMMARY_CLASS}>
          The jobs counted in every census
        </summary>
        <GroupTable
          caption={`${TITLE} and the jobs counted, Fall ${from} to Fall ${to}`}
          heading="Fall"
          columns={[...RATIO_COLUMNS, 'Per 100 faculty']}
          rows={rows.map(({ year, jobs, ratio }) => ({
            key: String(year),
            cells: [
              ...jobs.map((count) => ({ value: formatCount(count) })),
              { value: formatOrBlank(ratio, formatRatio) },
            ],
          }))}
        />
      </details>
    </div>
  )
}

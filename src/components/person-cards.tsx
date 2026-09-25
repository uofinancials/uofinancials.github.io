import {
  formatChange,
  formatDollars,
  formatOrBlank,
  formatYears,
} from '@/lib/format'
import type { PersonRun } from '@/lib/person-lookup'
import { runCards } from '@/lib/person-summary'

function Card({
  label,
  value,
  method,
}: {
  label: string
  value: string
  method: string
}) {
  return (
    <div className="space-y-1 rounded-md border p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
      <dd className="text-xs text-muted-foreground">{method}</dd>
    </div>
  )
}

/** The computed figures for the linked run holding the selected census. */
export function PersonCards({ run }: { run: PersonRun }) {
  const { yearsSinceStart, runChange, averageChange } = runCards(run)
  const first = run.years[0]?.year
  const last = run.years.at(-1)?.year
  return (
    <section className="space-y-2" aria-label="Computed figures">
      <p className="text-sm text-muted-foreground">
        Computed by this site from the records below, not published by UO.
        {run.isLinked
          ? ` From Fall ${first}-${last}, years linked on the exact name and the same pay department of a single primary job.`
          : ` Fall ${first} is not in a linked run, so no change is computed.`}
      </p>
      <dl className="grid gap-3 sm:grid-cols-3">
        <Card
          label="Years since earliest job start"
          value={formatOrBlank(yearsSinceStart, formatYears)}
          method={`From the earliest published job start date to the Fall ${last} census. A job start date is when that job began, not a hire date.`}
        />
        {runChange && (
          <Card
            label={`Rate change, Fall ${runChange.fromYear}-${runChange.toYear}`}
            value={formatChange(runChange.ratio)}
            method={`The primary job's published annual rate, ${formatDollars(runChange.fromCents)} to ${formatDollars(runChange.toCents)}. A rate is not pay, and it can change with a new job.`}
          />
        )}
        {run.isLinked && (
          <Card
            label="Average yearly rate change"
            value={formatOrBlank(averageChange?.ratio, formatChange)}
            method={`The mean change of the primary job's published rate from one census to the next, over ${averageChange?.pairsUsed ?? 0} of ${run.years.length - 1} pairs; pairs whose appointment % or term changed are left out.`}
          />
        )}
      </dl>
    </section>
  )
}

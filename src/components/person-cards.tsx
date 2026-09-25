import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatChange,
  formatDollars,
  formatOrBlank,
  formatYears,
} from '@/lib/format'
import type { PersonRun } from '@/lib/person-lookup'
import { runCards } from '@/lib/person-summary'

function Figure({
  label,
  value,
  method,
}: {
  label: string
  value: string
  method: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{method}</p>
      </CardContent>
    </Card>
  )
}

/** The computed figures for the linked run holding the selected census. */
export function PersonCards({ run }: { run: PersonRun }) {
  const {
    firstYear,
    lastYear,
    pairs,
    yearsSinceStart,
    runChange,
    averageChange,
  } = runCards(run)
  return (
    <section className="space-y-2" aria-label="Computed figures">
      <p className="text-sm text-muted-foreground">
        Computed by this site from the records below, not published by UO.
        {run.isLinked
          ? ` From Fall ${firstYear}-${lastYear}, years linked on the exact name and the same pay department of a single primary job.`
          : ` Fall ${firstYear} is not in a linked run, so no change is computed.`}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Figure
          label="Years since earliest job start"
          value={formatOrBlank(yearsSinceStart, formatYears)}
          method={`From the earliest published job start date to the Fall ${lastYear} census. A job start date is when that job began, not a hire date.`}
        />
        {runChange && (
          <Figure
            label={`Rate change, Fall ${runChange.fromYear}-${runChange.toYear}`}
            value={formatChange(runChange.ratio)}
            method={`The primary job's published annual rate, ${formatDollars(runChange.fromCents)} to ${formatDollars(runChange.toCents)}. A rate is not pay, and it can change with a new job.`}
          />
        )}
        {run.isLinked && (
          <Figure
            label="Average yearly rate change"
            value={formatOrBlank(averageChange?.ratio, formatChange)}
            method={`The mean change of the primary job's published rate from one census to the next, over ${averageChange?.pairsUsed ?? 0} of ${pairs} pairs; pairs whose appointment % or term changed are left out.`}
          />
        )}
      </div>
    </section>
  )
}

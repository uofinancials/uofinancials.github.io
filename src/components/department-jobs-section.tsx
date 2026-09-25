import { Link } from '@tanstack/react-router'
import { RadioField } from '@/components/radio-field'
import { SelectField } from '@/components/select-field'
import { SourceCitation } from '@/components/source-citation'
import { TrendsFigure } from '@/components/trends-figure'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fiscalYearLabel } from '@/data/budget'
import { type StaffKind, staffKindSchema } from '@/data/fall'
import type { AreaPlacement, ClassRow } from '@/lib/department-jobs'
import type { DepartmentSearch, DepartmentView } from '@/lib/department-search'
import {
  formatCount,
  formatDollars,
  formatFte,
  formatOrBlank,
} from '@/lib/format'
import { SPEND_METHOD } from '@/lib/overview'
import type { Trends } from '@/lib/trends'
import { MIN_JOBS_SHOWN } from '@/lib/trends'
import {
  METRIC_INFO,
  METRIC_OPTIONS,
  STAFF_KIND_OPTIONS,
} from '@/lib/trends-search'

const NUMBER_CELL = 'text-right tabular-nums'
const STAFF_KINDS = ['unclassified', 'classified'] as const
const KIND_TITLES = {
  unclassified: 'Unclassified jobs by rank',
  classified: 'Classified jobs by position class',
} as const
const COMPUTED = `${SPEND_METHOD} FTE is each job appointment percent, summed, temporaries included. Median salary rate is the median published annual salary rate of primary jobs, temporaries left out. Groups are those of the Trends page. Spend is left blank for any figure covering fewer than ${MIN_JOBS_SHOWN} paid jobs, and median for fewer than ${MIN_JOBS_SHOWN} primary jobs. Classes with fewer than ${MIN_JOBS_SHOWN} jobs are shown together.`
const AREA_NOTE =
  'An area’s jobs are those whose pay department the site places in it: by UO’s budget hierarchy for the census’s fiscal year, by a department-name prefix every placed department shares, or by hand. The table shows how many were placed each way.'

function ClassTable({ kind, rows }: { kind: StaffKind; rows: ClassRow[] }) {
  return (
    <Table>
      <caption className="mb-2 caption-top text-left font-medium">
        {KIND_TITLES[kind]}
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">
            {kind === 'classified' ? 'Position class' : 'Rank'}
          </TableHead>
          <TableHead scope="col" className="text-right">
            Jobs
          </TableHead>
          <TableHead scope="col" className="text-right">
            FTE
          </TableHead>
          <TableHead scope="col" className="text-right">
            Salary spend
          </TableHead>
          <TableHead scope="col" className="text-right">
            Median salary rate
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableHead scope="row" className="font-normal">
              {row.label}
            </TableHead>
            <TableCell className={NUMBER_CELL}>
              {formatCount(row.jobs)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatOrBlank(row.fteHundredths, formatFte)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatOrBlank(row.spendCents, formatDollars)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatOrBlank(row.medianRateCents, formatDollars)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function PlacementTable({ placements }: { placements: AreaPlacement[] }) {
  return (
    <Table>
      <caption className="mb-2 caption-top text-left font-medium">
        How the area’s jobs were placed
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Fall</TableHead>
          <TableHead scope="col">Hierarchy</TableHead>
          <TableHead scope="col" className="text-right">
            Published
          </TableHead>
          <TableHead scope="col" className="text-right">
            By name
          </TableHead>
          <TableHead scope="col" className="text-right">
            By hand
          </TableHead>
          <TableHead scope="col" className="text-right">
            Unplaced, all areas
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {placements.map(({ year, fiscalYear, bases, unassignedSiteWide }) => (
          <TableRow key={year}>
            <TableHead scope="row" className="font-normal">
              {year}
            </TableHead>
            <TableCell>{fiscalYearLabel(fiscalYear)}</TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatCount(bases.published)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatCount(bases.name)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatCount(bases.hand)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>
              {formatCount(unassignedSiteWide)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** A department's jobs over the censuses, its classes in one census, and, for an area, how its jobs were placed. */
export function DepartmentJobsSection({
  code,
  trends,
  classRows,
  placements,
  view,
  yearsWithJobs,
  onChange,
}: {
  code: string
  trends: Trends
  classRows: Record<StaffKind, ClassRow[]>
  placements: AreaPlacement[] | null
  view: DepartmentView
  yearsWithJobs: number[]
  onChange: (search: DepartmentSearch) => void
}) {
  const first = trends.total[0]?.year
  const last = trends.total.at(-1)?.year
  const title = `${METRIC_INFO[view.metric].label} by group, Fall ${first}-${last}`
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Jobs</h2>
      <div className="flex flex-wrap items-end gap-4">
        <RadioField
          legend="Measure"
          name="metric"
          value={view.metric}
          options={METRIC_OPTIONS}
          onSelect={(metric) => onChange({ metric })}
        />
        <SelectField
          label="Staff"
          value={view.kind}
          options={STAFF_KIND_OPTIONS}
          onSelect={(value) =>
            onChange({ kind: staffKindSchema.safeParse(value).data })
          }
        />
      </div>
      <h3 className="font-medium">{title}</h3>
      <TrendsFigure trends={trends} metric={view.metric} label={title} />
      {view.year !== null && (
        <>
          <SelectField
            label="Classes in Fall"
            value={String(view.year)}
            options={yearsWithJobs.map((year) => [String(year), String(year)])}
            onSelect={(value) => onChange({ year: Number(value) })}
          />
          <p className="flex flex-wrap gap-x-4 text-sm">
            <Link
              className="underline"
              to="/people"
              search={{ dept: code, year: view.year }}
            >
              Jobs by name, Fall {view.year}
            </Link>
          </p>
          {STAFF_KINDS.map((kind) => {
            const rows = classRows[kind]
            return rows.length === 0 ? null : (
              <ClassTable key={kind} kind={kind} rows={rows} />
            )
          })}
        </>
      )}
      {placements && (
        <>
          <p className="text-sm text-muted-foreground">{AREA_NOTE}</p>
          <PlacementTable placements={placements} />
        </>
      )}
      {first !== undefined && last !== undefined && (
        <SourceCitation
          source={{ kind: 'fall-range', from: first, to: last }}
          computed={COMPUTED}
        />
      )}
    </section>
  )
}

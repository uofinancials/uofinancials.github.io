import { SourceCitation } from '@/components/source-citation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AcrossTheBoardTerm } from '@/data/raises'
import {
  formatChange,
  formatCount,
  formatOrBlank,
  formatPoints,
} from '@/lib/format'
import { pairLabel } from '@/lib/pay-changes'
import {
  BASIS_POINTS_PER_UNIT,
  type RaiseComparison,
} from '@/lib/raise-comparison'
import { MIN_JOBS_SHOWN } from '@/lib/trends'

const NUMBER_CELL = 'text-right tabular-nums'
const NO_TERM = 'No term recorded'

const COMPUTED = `each continuing job's raise group is this site's estimate from the earlier job's published class, rank, OA salary grade, and title, since UO publishes no bargaining unit: position class J is Teamsters 206; police officer, campus dispatcher, and community service officer classes are UOPA from Fall 2017; other classified jobs are SEIU 503; ranked unclassified jobs are United Academics, split by a pro tem, visiting, retired, or emeritus title, then tenure status, then a research rank; unranked jobs with an OA grade are officers of administration. Supervisors, law, and EC CARES faculty, whom the United Academics unit excludes, cannot be told apart and are counted in it. The across-the-board increase compounds every cited across-the-board term for the row that took effect after the earlier census date and on or before the later one; which terms apply to which row is this site's reading of each term's published scope. A retroactive term may reach the census a pair later. The part other than across-the-board is the median change less the across-the-board increase, in percentage points: an estimate of merit, step, equity, promotion, and other increases for the group, never for a person. Medians are shown for ${MIN_JOBS_SHOWN} or more jobs.`

function effectiveOf({ effectiveDate, effectiveBetween }: AcrossTheBoardTerm) {
  if (effectiveDate) return effectiveDate
  return effectiveBetween
    ? `${effectiveBetween.from} to ${effectiveBetween.to}`
    : ''
}

function TermsTable({ terms }: { terms: AcrossTheBoardTerm[] }) {
  return (
    <Table>
      <caption className="sr-only">Across-the-board terms used</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Raise group</TableHead>
          <TableHead scope="col">Applies to</TableHead>
          <TableHead scope="col" className="text-right">
            Percent
          </TableHead>
          <TableHead scope="col">Effective</TableHead>
          <TableHead scope="col">Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {terms.map((term) => (
          <TableRow
            key={`${term.source.url} ${term.source.location} ${term.appliesTo}`}
          >
            <TableCell>{term.employeeGroup}</TableCell>
            <TableCell>
              {term.appliesTo}
              {term.note && (
                <span className="block text-muted-foreground">{term.note}</span>
              )}
            </TableCell>
            <TableCell className={NUMBER_CELL}>{term.percent}%</TableCell>
            <TableCell>{effectiveOf(term)}</TableCell>
            <TableCell>
              <a className="underline" href={term.source.url}>
                {term.source.document}
              </a>
              , {term.source.location}, retrieved {term.source.retrievedOn}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** One census pair's median change by raise group beside its cited across-the-board increase, with the terms and gaps behind it. */
export function RaiseComparisonSection({
  comparison: { rows, unplaced, terms, gaps },
  pair,
  isGroupOpened,
}: {
  comparison: RaiseComparison
  pair: number
  isGroupOpened: boolean
}) {
  const title = `Across-the-board and other increases, Fall ${pairLabel(pair)} (estimated)`
  return (
    <section className="space-y-4">
      <h3 className="font-medium">{title}</h3>
      {isGroupOpened && (
        <p className="text-sm text-muted-foreground">
          Raise groups cut across the employee groups, so this table leaves out
          the opened group; the other filters apply.
        </p>
      )}
      <Table>
        <caption className="sr-only">{title}</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Raise group</TableHead>
            <TableHead scope="col" className="text-right">
              Continuing jobs
            </TableHead>
            <TableHead scope="col" className="text-right">
              Median change
            </TableHead>
            <TableHead scope="col" className="text-right">
              Across-the-board
            </TableHead>
            <TableHead scope="col" className="text-right">
              Other than across-the-board
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ row, jobs, median, acrossTheBoard, other }) => (
            <TableRow key={row.label}>
              <TableHead scope="row" className="font-normal">
                {row.label}
              </TableHead>
              <TableCell className={NUMBER_CELL}>{formatCount(jobs)}</TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatOrBlank(median, formatChange)}
              </TableCell>
              <TableCell className={NUMBER_CELL}>
                {acrossTheBoard
                  ? formatChange(
                      acrossTheBoard.basisPoints / BASIS_POINTS_PER_UNIT,
                    )
                  : NO_TERM}
              </TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatOrBlank(other, formatPoints)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground">
        {formatCount(unplaced)} continuing jobs are in no raise group:
        executives, coaches, postdoctoral scholars, police sergeants, and
        unclassified jobs with neither a rank nor an OA salary grade.
      </p>
      {terms.length > 0 && (
        <>
          <h4 className="text-sm font-medium">Across-the-board terms used</h4>
          <TermsTable terms={terms} />
        </>
      )}
      {gaps.length > 0 && (
        <>
          <h4 className="text-sm font-medium">Terms not recorded</h4>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            {gaps.map(({ employeeGroup, fiscalYears, note }) => (
              <li key={`${employeeGroup} ${fiscalYears}`}>
                {employeeGroup}, {fiscalYears}: {note}
              </li>
            ))}
          </ul>
        </>
      )}
      <SourceCitation
        source={{ kind: 'fall-range', from: pair, to: pair + 1 }}
        computed={COMPUTED}
      />
    </section>
  )
}

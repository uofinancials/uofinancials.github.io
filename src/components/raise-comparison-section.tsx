import { CitedSourceText } from '@/components/cited-source-text'
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
import type { RaiseComparison } from '@/lib/raise-comparison'
import { RAISE_ROW_METHOD, UNPLACED_JOBS } from '@/lib/raise-groups'
import { MIN_JOBS_SHOWN } from '@/lib/trends'

const NUMBER_CELL = 'text-right tabular-nums'
const NO_TERM = 'No term recorded'

const COMPUTED = `${RAISE_ROW_METHOD} The across-the-board increase compounds every cited across-the-board term for the row that took effect after the earlier census date and on or before the later one; which terms apply to which row is this site's reading of each term's published scope. A retroactive term may reach the census a pair later. The part other than across-the-board is the median change less the across-the-board increase, in percentage points: an estimate of merit, step, equity, promotion, and other increases for the group, never for a person. Medians are shown for ${MIN_JOBS_SHOWN} or more jobs.`

function effectiveOf({ effective: { from, to } }: AcrossTheBoardTerm) {
  return from === to ? from : `${from} to ${to}`
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
            key={`${term.source.url} ${term.source.location} ${term.appliesTo} ${term.effective.from} ${term.percent}`}
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
              <CitedSourceText source={term.source} />
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
                {acrossTheBoard ? formatChange(acrossTheBoard.ratio) : NO_TERM}
              </TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatOrBlank(other, formatPoints)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground">
        {formatCount(unplaced)} continuing jobs are in no raise group:{' '}
        {UNPLACED_JOBS}.
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

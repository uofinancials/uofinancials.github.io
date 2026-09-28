import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import { PayChangeCountsTable } from '@/components/trends/pay-change-counts-table'
import { PayChangeDistribution } from '@/components/trends/pay-change-distribution'
import { PayChangeLines } from '@/components/trends/pay-change-lines'
import { RaiseComparisonSection } from '@/components/trends/raise-comparison-section'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PayChanges } from '@/hooks/use-pay-changes'
import type { SectionSource } from '@/lib/shared/citation'
import {
  CONTINUING_JOB_METHOD,
  pairLabel,
  RANK_RENAMES,
  RATE_NOTE,
  TITLE_ABBREVIATIONS,
} from '@/lib/trends/pay-change-labels'
import {
  CHANGE_LABEL,
  linesLabel,
  type PayChangesSearch,
  type TrendView,
} from '@/lib/trends/search'

const PAY_CHANGE_METHOD = `${CONTINUING_JOB_METHOD} Class changes compare the class number, whatever its letter prefix; rank changes leave out the renames and unpublished ranks below; title changes compare titles without case, punctuation, or the abbreviations below. A changed class, rank, or title is a changed published label, not necessarily a promotion.`

const NO_PAIRS =
  'A change needs two consecutive censuses; choose a wider range of years.'

function LabelTables() {
  return (
    <PageSection title="Renames and abbreviations">
      <p className="text-sm text-muted-foreground">
        This site treats these rank moves, in the census that first publishes
        the new rank, as renames rather than rank changes; a job's title change
        that year is not counted either.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Fall</TableHead>
            <TableHead scope="col">Rank as published</TableHead>
            <TableHead scope="col">Renamed to</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {RANK_RENAMES.map(({ toYear, from, to }) => (
            <TableRow key={`${toYear} ${from}`}>
              <TableCell>{pairLabel(toYear - 1)}</TableCell>
              <TableCell>{from}</TableCell>
              <TableCell>{to}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground">
        Titles are compared with these words read as the same.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Word</TableHead>
            <TableHead scope="col">Also published as</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(TITLE_ABBREVIATIONS).map(([word, forms]) => (
            <TableRow key={word}>
              <TableCell>{word}</TableCell>
              <TableCell>{forms.join(', ')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageSection>
  )
}

/** The change measure's lines, counts, one pair's distribution, citation, and label tables; the pairs are those in the view's range. */
export function PayChangesSection({
  changes: { fromYears, series, counts, distribution, raises },
  view,
  filterSources,
  onChange,
}: {
  changes: PayChanges
  view: TrendView
  filterSources: SectionSource[]
  onChange: (search: PayChangesSearch) => void
}) {
  const first = fromYears[0]
  const last = fromYears.at(-1)
  if (first === undefined || last === undefined) {
    return <p>{NO_PAIRS}</p>
  }
  const span = `Fall ${pairLabel(first)} to ${pairLabel(last)}`
  const title = `${CHANGE_LABEL}, continuing jobs, by ${linesLabel(view.group)}, ${span}`
  return (
    <>
      <PageSection title={title}>
        <p className="text-sm text-muted-foreground">{RATE_NOTE}</p>
        <PayChangeLines
          series={series}
          fromYears={fromYears}
          hidden={view.hide}
          label={title}
        />
        <h3 className="font-medium">Changed class, rank, and title</h3>
        <PayChangeCountsTable
          rows={counts}
          caption={`Continuing jobs with a changed class, rank, or title, ${span}`}
        />
        <Sources
          sources={[
            {
              kind: 'fall-range',
              from: first,
              to: last + 1,
              computed: PAY_CHANGE_METHOD,
            },
            ...filterSources,
          ]}
        />
      </PageSection>
      {raises && (
        <RaiseComparisonSection
          comparison={raises}
          pair={view.pair}
          isGroupOpened={view.group !== null}
        />
      )}
      <PayChangeDistribution
        distribution={distribution}
        pair={view.pair}
        fromYears={fromYears}
        onPair={(pair) => onChange({ pair })}
      />
      <LabelTables />
    </>
  )
}

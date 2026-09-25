import { useSuspenseQueries } from '@tanstack/react-query'
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { PayChangeCountsTable } from '@/components/pay-change-counts-table'
import { PayChangeDistribution } from '@/components/pay-change-distribution'
import { PayChangeLines } from '@/components/pay-change-lines'
import { PayChangesControls } from '@/components/pay-changes-controls'
import { SourceCitation } from '@/components/source-citation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FallYear } from '@/data/fall'
import { fallYearQuery } from '@/data/queries'
import { MIN_JOBS_SHOWN } from '@/lib/department-jobs'
import { RANK_RENAMES, TITLE_ABBREVIATIONS } from '@/lib/pay-change-labels'
import {
  changeCounts,
  continuingPairs,
  filterNames,
  filterPairs,
  pairLabel,
  payChangeDistribution,
  payChangeTrends,
} from '@/lib/pay-changes'
import {
  type PayChangesSearch,
  resolvePayChangesView,
} from '@/lib/pay-changes-search'

const RATE_NOTE =
  'A change is between the annual salary rates UO publishes for one job in two consecutive Fall censuses. It includes every increase that took effect between the two census dates, so an increase effective before a census counts in the pair ending there. Rates are not pay, and dollars are as published, not adjusted for inflation.'
const COMPUTED = `a continuing job is a person link this site computes: a name, exactly as published, with one primary job in each of two consecutive censuses, both paid by the same pay department. UO publishes no person identifier, so people who change department or name are not linked. Pairs are left out when either job is a classified temporary (annualised hourly rates), the job moved between classified and unclassified, or its term changed between 9 and 12 months; appointment changes stay in, since a rate is the full-time rate. The change is the later rate over the earlier, less one, counted in the group, department, and class or rank of the earlier job, as on the Trends page and the person view's median. Medians and distributions are shown for ${MIN_JOBS_SHOWN} or more pairs. Class changes compare the class number, whatever its letter prefix; rank changes leave out the renames and unpublished ranks below; title changes compare titles without case, punctuation, or the abbreviations below. A changed class, rank, or title is a changed published label, not necessarily a promotion.`

function toPairs(results: { data: FallYear }[]) {
  return continuingPairs(results.map(({ data }) => data))
}

function LabelTables() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Renames and abbreviations</h2>
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
    </section>
  )
}

function usePayChanges() {
  const { years } = useLoaderData({ from: '/pay-changes' })
  const search = useSearch({ from: '/pay-changes' })
  const pairs = useSuspenseQueries({
    queries: years.map(fallYearQuery),
    combine: toPairs,
  })
  const fromYears = useMemo(
    () => years.filter((year) => years.includes(year + 1)),
    [years],
  )
  const view = resolvePayChangesView(search, fromYears)
  const { kind, dept, position } = view
  const shown = useMemo(
    () => filterPairs(pairs, { kind, dept, position }),
    [pairs, kind, dept, position],
  )
  const series = useMemo(
    () => payChangeTrends(shown, fromYears),
    [shown, fromYears],
  )
  const counts = useMemo(
    () => changeCounts(shown, fromYears),
    [shown, fromYears],
  )
  const names = filterNames(pairs, view)
  return { fromYears, view, shown, series, counts, names }
}

export function PayChangesPage() {
  const navigate = useNavigate({ from: '/pay-changes' })
  const { fromYears, view, shown, series, counts, names } = usePayChanges()
  const first = fromYears[0] ?? view.pair
  const last = fromYears.at(-1) ?? view.pair
  const span = `Fall ${pairLabel(first)} to ${pairLabel(last)}`
  const title = `Median change in salary rate, continuing jobs, ${span}`
  const handleChange = (patch: PayChangesSearch) =>
    navigate({ search: (previous) => ({ ...previous, ...patch }) })
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Pay changes</h1>
      <p className="text-sm text-muted-foreground">{RATE_NOTE}</p>
      <PayChangesControls view={view} names={names} onChange={handleChange} />
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <PayChangeLines series={series} fromYears={fromYears} label={title} />
        <h3 className="font-medium">Changed class, rank, and title</h3>
        <PayChangeCountsTable
          rows={counts}
          caption={`Continuing jobs with a changed class, rank, or title, ${span}`}
        />
      </section>
      <PayChangeDistribution
        distribution={payChangeDistribution(
          shown.filter(({ fromYear }) => fromYear === view.pair),
        )}
        pair={view.pair}
        fromYears={fromYears}
        onPair={(pair) => handleChange({ pair })}
      />
      <SourceCitation
        source={{ kind: 'fall-range', from: first, to: last + 1 }}
        computed={COMPUTED}
      />
      <LabelTables />
    </div>
  )
}

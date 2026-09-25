import { useSuspenseQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Manifest } from '@/data/manifest'
import { manifestQuery, raiseTermsQuery } from '@/data/queries'
import { fiscalYearLabel, listCitedDocuments } from '@/lib/citation'
import { formatCount, formatDollars } from '@/lib/format'

const NUMBER_CELL = 'px-2 py-1 text-right tabular-nums'
const TEXT_CELL = 'px-2 py-1'
const HASH_CELL = 'px-2 py-1 font-mono text-xs break-all'

function Section({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[48rem] text-sm">
        <thead>
          <tr className="border-b text-left">
            {head.map((label) => (
              <th key={label} scope="col" className="px-2 py-1 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  )
}

function FallSources({ fall }: { fall: Manifest['fall'] }) {
  return (
    <Table
      head={[
        'Census',
        'Report',
        'File',
        'Pages',
        'Extracted',
        'Retrieved',
        'Records',
        'Possible students',
        'SHA-256',
      ]}
    >
      {fall.map((entry) => (
        <tbody key={entry.year} id={`fall-${entry.year}`} className="border-b">
          {entry.files.map((file) => (
            <tr key={file.sha256}>
              <td className={TEXT_CELL}>{entry.censusDate}</td>
              <td className={TEXT_CELL}>{file.kind}</td>
              <td className={TEXT_CELL}>{file.fileName}</td>
              <td className={NUMBER_CELL}>{formatCount(file.pages)}</td>
              <td className={TEXT_CELL}>{file.extractDate}</td>
              <td className={TEXT_CELL}>{file.retrievedOn}</td>
              <td className={NUMBER_CELL}>{formatCount(file.records)}</td>
              <td className={NUMBER_CELL}>
                {formatCount(file.possibleStudents)}
              </td>
              <td className={HASH_CELL}>{file.sha256}</td>
            </tr>
          ))}
        </tbody>
      ))}
    </Table>
  )
}

function BudgetSources({ budget }: { budget: Manifest['budget'] }) {
  return (
    <Table
      head={[
        'Year',
        'Period',
        'Workbook',
        'Last modified',
        'Retrieved',
        'Rows',
        'Expenditure budget',
        'SHA-256',
      ]}
    >
      <tbody>
        {budget.map((entry) => {
          const label = fiscalYearLabel(entry.fiscalYear)
          return (
            <tr key={entry.fiscalYear} id={`budget-${label.toLowerCase()}`}>
              <td className={TEXT_CELL}>{label}</td>
              <td className={TEXT_CELL}>{entry.period}</td>
              <td className={TEXT_CELL}>
                <a className="underline" href={entry.url}>
                  {entry.fileName}
                </a>
              </td>
              <td className={TEXT_CELL}>
                {entry.lastModified ?? 'not stated'}
              </td>
              <td className={TEXT_CELL}>{entry.retrievedOn}</td>
              <td className={NUMBER_CELL}>{formatCount(entry.rows)}</td>
              <td className={NUMBER_CELL}>
                {formatDollars(entry.totalExpenditureBudgetCents)}
              </td>
              <td className={HASH_CELL}>{entry.sha256}</td>
            </tr>
          )
        })}
      </tbody>
    </Table>
  )
}

function RateSources({ rates }: { rates: NonNullable<Manifest['rates']> }) {
  return (
    <>
      <p>
        {formatCount(rates.groups)} employee rate groups,{' '}
        {formatCount(rates.opeRates)} OPE rates, {formatCount(rates.leaveRates)}{' '}
        leave rates, and {formatCount(rates.persRepayment)} PERS repayment
        rates.
      </p>
      <Table head={['Page', 'Last modified', 'Retrieved', 'SHA-256']}>
        <tbody>
          {rates.pages.map((page) => (
            <tr key={page.url}>
              <td className={TEXT_CELL}>
                <a className="underline" href={page.url}>
                  {page.url}
                </a>
              </td>
              <td className={TEXT_CELL}>{page.lastModified ?? 'not stated'}</td>
              <td className={TEXT_CELL}>{page.retrievedOn}</td>
              <td className={HASH_CELL}>{page.sha256}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}

function RaiseSources() {
  const { data } = useSuspenseQuery(raiseTermsQuery)
  return (
    <Table head={['Document', 'Terms', 'Retrieved']}>
      <tbody>
        {listCitedDocuments(data.terms).map((document) => (
          <tr key={document.url}>
            <td className={TEXT_CELL}>
              <a className="underline" href={document.url}>
                {document.document}
              </a>
            </td>
            <td className={NUMBER_CELL}>{formatCount(document.terms)}</td>
            <td className={TEXT_CELL}>{document.retrievedOn}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

export function SourcesPage() {
  const { data: manifest } = useSuspenseQuery(manifestQuery)
  const [firstFall] = manifest.fall
  const [firstBudget] = manifest.budget
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Sources</h1>
        <p>
          Every figure on this site comes from reports the University of Oregon
          publishes without a login. The site extracts the figures into its own
          files and links to the originals; it does not rehost them. Figures the
          site computes are labelled as computed.
        </p>
      </div>
      <Section title="Fall Census salary reports">
        {firstFall && (
          <p>
            Published by the UO Office of Data Enablement on its{' '}
            <a className="underline" href={firstFall.sourcePage}>
              salary reports page
            </a>
            , one classified and one unclassified report per census.
          </p>
        )}
        <FallSources fall={manifest.fall} />
      </Section>
      <Section title="Operational expenditure budgets">
        {firstBudget && (
          <p>
            Published by UO Budget and Resource Planning on its{' '}
            <a className="underline" href={firstBudget.sourcePage}>
              budget reports page
            </a>
            .
          </p>
        )}
        <BudgetSources budget={manifest.budget} />
      </Section>
      {manifest.rates && (
        <Section id="rates" title="Blended OPE rates">
          <RateSources rates={manifest.rates} />
        </Section>
      )}
      <Section title="Raise terms">
        <p>
          Across-the-board, merit, step, and one-time raise terms, entered by
          hand from these documents, each term citing its section and page.
        </p>
        <RaiseSources />
      </Section>
    </div>
  )
}

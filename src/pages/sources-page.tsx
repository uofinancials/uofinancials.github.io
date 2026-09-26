import { useSuspenseQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { PageSection } from '@/components/page-section'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fiscalYearLabel } from '@/data/budget'
import type { Manifest } from '@/data/manifest'
import { manifestQuery, outlookQuery, raiseTermsQuery } from '@/data/queries'
import { outlookSources } from '@/lib/budget-outlook'
import { listCitedDocuments, sourceAnchor } from '@/lib/citation'
import { formatCount, formatDollars } from '@/lib/format'
import { NUMBER_CELL } from '@/lib/utils'

const HASH_CELL = 'font-mono text-xs'
const NOT_STATED = 'not stated'

function SourceTable({
  head,
  children,
}: {
  head: string[]
  children: ReactNode
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {head.map((label) => (
            <TableHead key={label} scope="col">
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      {children}
    </Table>
  )
}

function FallSources({ fall }: { fall: Manifest['fall'] }) {
  return (
    <SourceTable
      head={[
        'Census',
        'Report',
        'File',
        'Pages',
        'Extracted',
        'Retrieved',
        'Records',
        'SHA-256',
      ]}
    >
      {fall.map((entry) => (
        <TableBody
          key={entry.year}
          id={sourceAnchor({ kind: 'fall', year: entry.year })}
        >
          {entry.files.map((file) => (
            <TableRow key={file.sha256}>
              <TableCell>{entry.censusDate}</TableCell>
              <TableCell>{file.kind}</TableCell>
              <TableCell>{file.fileName}</TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatCount(file.pages)}
              </TableCell>
              <TableCell>{file.extractDate}</TableCell>
              <TableCell>{file.retrievedOn}</TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatCount(file.records)}
              </TableCell>
              <TableCell className={HASH_CELL}>{file.sha256}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      ))}
    </SourceTable>
  )
}

function BudgetSources({ budget }: { budget: Manifest['budget'] }) {
  return (
    <SourceTable
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
      <TableBody>
        {budget.map((entry) => {
          const label = fiscalYearLabel(entry.fiscalYear)
          return (
            <TableRow
              key={entry.fiscalYear}
              id={sourceAnchor({
                kind: 'budget',
                fiscalYear: entry.fiscalYear,
              })}
            >
              <TableCell>{label}</TableCell>
              <TableCell>{entry.period}</TableCell>
              <TableCell>
                <a className="underline" href={entry.url}>
                  {entry.fileName}
                </a>
              </TableCell>
              <TableCell>{entry.lastModified ?? NOT_STATED}</TableCell>
              <TableCell>{entry.retrievedOn}</TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatCount(entry.rows)}
              </TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatDollars(entry.totalExpenditureBudgetCents)}
              </TableCell>
              <TableCell className={HASH_CELL}>{entry.sha256}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </SourceTable>
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
      <SourceTable head={['Page', 'Last modified', 'Retrieved', 'SHA-256']}>
        <TableBody>
          {rates.pages.map((page) => (
            <TableRow key={page.url}>
              <TableCell>
                <a className="underline" href={page.url}>
                  {page.url}
                </a>
              </TableCell>
              <TableCell>{page.lastModified ?? NOT_STATED}</TableCell>
              <TableCell>{page.retrievedOn}</TableCell>
              <TableCell className={HASH_CELL}>{page.sha256}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </SourceTable>
    </>
  )
}

function RaiseSources() {
  const { data } = useSuspenseQuery(raiseTermsQuery)
  return (
    <SourceTable head={['Document', 'Terms', 'Retrieved']}>
      <TableBody>
        {listCitedDocuments(data.terms.map(({ source }) => source)).map(
          (document) => (
            <TableRow key={document.url}>
              <TableCell>
                <a className="underline" href={document.url}>
                  {document.document}
                </a>
              </TableCell>
              <TableCell className={NUMBER_CELL}>
                {formatCount(document.citations)}
              </TableCell>
              <TableCell>{document.retrievedOn}</TableCell>
            </TableRow>
          ),
        )}
      </TableBody>
    </SourceTable>
  )
}

function OutlookSources() {
  const { data } = useSuspenseQuery(outlookQuery)
  return (
    <SourceTable head={['Document', 'Retrieved']}>
      <TableBody>
        {listCitedDocuments(outlookSources(data)).map((document) => (
          <TableRow key={document.url}>
            <TableCell>
              <a className="underline" href={document.url}>
                {document.document}
              </a>
            </TableCell>
            <TableCell>{document.retrievedOn}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </SourceTable>
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
          publishes for public consumption. The site extracts the figures into
          its own files and links to the originals; it does not rehost them.
          Figures the site computes are labelled as computed.
        </p>
      </div>
      <PageSection title="Fall Census salary reports">
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
      </PageSection>
      <PageSection title="Operational expenditure budgets">
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
      </PageSection>
      {manifest.rates && (
        <PageSection
          id={sourceAnchor({ kind: 'rates' })}
          title="Blended OPE rates"
        >
          <RateSources rates={manifest.rates} />
        </PageSection>
      )}
      <PageSection title="Raise terms">
        <p>
          Across-the-board, merit, step, and one-time raise terms, entered by
          hand from these documents, each term citing its section and page.
        </p>
        <RaiseSources />
      </PageSection>
      <PageSection title="Budget outlook">
        <p>
          The E&G fund projection, the budget figures, and the announced budget
          actions on the budget page, entered by hand from these documents, each
          figure citing its page.
        </p>
        <OutlookSources />
      </PageSection>
    </div>
  )
}

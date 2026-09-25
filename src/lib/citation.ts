import type { Manifest } from '../data/manifest.ts'
import type { RaiseTerm } from '../data/raises.ts'

export type SourceRef =
  | { kind: 'fall'; year: number }
  | { kind: 'budget'; fiscalYear: number }
  | { kind: 'rates' }

export type Citation = {
  dataset: string
  publisher: string
  href: string
  retrievedOn: string
  /** The dataset's element id on the sources page. */
  anchor: string
}

const DATA_ENABLEMENT = 'UO Office of Data Enablement'
const BUDGET_AND_RESOURCE_PLANNING = 'UO Budget and Resource Planning'

function latest(dates: string[]): string {
  const last = [...dates].sort().at(-1)
  if (!last) throw new Error('A manifest entry lists no retrieval date')
  return last
}

export function fiscalYearLabel(fiscalYear: number): string {
  return `FY${String(fiscalYear).slice(2)}`
}

export function citeSource(manifest: Manifest, source: SourceRef): Citation {
  switch (source.kind) {
    case 'fall': {
      const entry = manifest.fall.find((fall) => fall.year === source.year)
      if (!entry) throw new Error(`No manifest entry for Fall ${source.year}`)
      return {
        dataset: `Fall ${source.year} Census salary reports`,
        publisher: DATA_ENABLEMENT,
        href: entry.sourcePage,
        retrievedOn: latest(entry.files.map((file) => file.retrievedOn)),
        anchor: `fall-${source.year}`,
      }
    }
    case 'budget': {
      const label = fiscalYearLabel(source.fiscalYear)
      const entry = manifest.budget.find(
        (budget) => budget.fiscalYear === source.fiscalYear,
      )
      if (!entry) throw new Error(`No manifest entry for the ${label} budget`)
      return {
        dataset: `${label} operational expenditure budget`,
        publisher: BUDGET_AND_RESOURCE_PLANNING,
        href: entry.sourcePage,
        retrievedOn: entry.retrievedOn,
        anchor: `budget-${label.toLowerCase()}`,
      }
    }
    case 'rates': {
      const [page] = manifest.rates?.pages ?? []
      if (!manifest.rates || !page) {
        throw new Error('No manifest entry for the OPE rates')
      }
      return {
        dataset: 'Blended OPE rates',
        publisher: BUDGET_AND_RESOURCE_PLANNING,
        href: page.url,
        retrievedOn: latest(manifest.rates.pages.map((p) => p.retrievedOn)),
        anchor: 'rates',
      }
    }
  }
}

export type CitedDocument = {
  url: string
  document: string
  retrievedOn: string
  terms: number
}

/** Each distinct document the raise terms cite, in first-cited order. */
export function listCitedDocuments(terms: RaiseTerm[]): CitedDocument[] {
  const documents = new Map<string, CitedDocument>()
  for (const { source } of terms) {
    const cited = documents.get(source.url)
    documents.set(source.url, {
      url: source.url,
      document: source.document,
      retrievedOn: latest([source.retrievedOn, cited?.retrievedOn ?? '']),
      terms: (cited?.terms ?? 0) + 1,
    })
  }
  return [...documents.values()]
}

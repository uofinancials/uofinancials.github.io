import { fiscalYearLabel } from '../data/budget.ts'
import type { Manifest } from '../data/manifest.ts'
import type { RaiseTerm } from '../data/raises.ts'

export type SourceRef =
  | { kind: 'fall'; year: number }
  | { kind: 'fall-range'; from: number; to: number }
  | { kind: 'budget'; fiscalYear: number }
  | { kind: 'budget-range'; from: number; to: number }
  | { kind: 'rates' }

export type Citation = {
  dataset: string
  publisher: string
  href: string
  retrievedOn: string
  anchor: string
}

const DATA_ENABLEMENT = 'UO Office of Data Enablement'
const BUDGET_AND_RESOURCE_PLANNING = 'UO Budget and Resource Planning'

function latest(dates: string[]): string {
  const last = [...dates].sort().at(-1)
  if (!last) throw new Error('A manifest entry lists no retrieval date')
  return last
}

/** The dataset's element id on the sources page. */
export function sourceAnchor(source: SourceRef): string {
  switch (source.kind) {
    case 'fall':
      return `fall-${source.year}`
    case 'fall-range':
      return `fall-${source.from}`
    case 'budget':
      return `budget-${fiscalYearLabel(source.fiscalYear).toLowerCase()}`
    case 'budget-range':
      return `budget-${fiscalYearLabel(source.from).toLowerCase()}`
    case 'rates':
      return 'rates'
  }
}

function sharedSourcePage(
  entries: { sourcePage: string }[],
  range: string,
): string {
  const pages = new Set(entries.map((entry) => entry.sourcePage))
  const [href] = pages
  if (!href || pages.size > 1) {
    throw new Error(
      `${range} needs one shared source page; the manifest lists ${pages.size}`,
    )
  }
  return href
}

function citeFallRange(
  manifest: Manifest,
  { from, to }: { from: number; to: number },
): Citation {
  const entries = manifest.fall.filter(({ year }) => year >= from && year <= to)
  return {
    dataset: `Fall ${from}-${to} Census salary reports`,
    publisher: DATA_ENABLEMENT,
    href: sharedSourcePage(entries, `Fall ${from}-${to}`),
    retrievedOn: latest(
      entries.flatMap((entry) => entry.files.map((file) => file.retrievedOn)),
    ),
    anchor: sourceAnchor({ kind: 'fall-range', from, to }),
  }
}

function citeBudgetRange(
  manifest: Manifest,
  { from, to }: { from: number; to: number },
): Citation {
  const entries = manifest.budget.filter(
    ({ fiscalYear }) => fiscalYear >= from && fiscalYear <= to,
  )
  const range = `${fiscalYearLabel(from)}-${fiscalYearLabel(to)}`
  return {
    dataset: `${range} operational expenditure budgets`,
    publisher: BUDGET_AND_RESOURCE_PLANNING,
    href: sharedSourcePage(entries, range),
    retrievedOn: latest(entries.map((entry) => entry.retrievedOn)),
    anchor: sourceAnchor({ kind: 'budget-range', from, to }),
  }
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
        anchor: sourceAnchor(source),
      }
    }
    case 'fall-range':
      return citeFallRange(manifest, source)
    case 'budget-range':
      return citeBudgetRange(manifest, source)
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
        anchor: sourceAnchor(source),
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
        anchor: sourceAnchor(source),
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
      retrievedOn:
        cited && cited.retrievedOn > source.retrievedOn
          ? cited.retrievedOn
          : source.retrievedOn,
      terms: (cited?.terms ?? 0) + 1,
    })
  }
  return [...documents.values()]
}

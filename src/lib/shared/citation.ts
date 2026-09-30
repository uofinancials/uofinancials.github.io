import { fiscalYearLabel } from '../../data/budget.ts'
import {
  type CitedSource,
  type DocumentSource,
  sourceKey,
} from '../../data/cited-source.ts'
import type { Manifest } from '../../data/manifest.ts'

export type SourceRef =
  | { kind: 'fall'; year: number }
  | { kind: 'fall-range'; from: number; to: number }
  | { kind: 'budget'; fiscalYear: number }
  | { kind: 'budget-range'; from: number; to: number }
  /** Fiscal years of the FY total pay reports, by the year each ends in. */
  | { kind: 'fy-range'; from: number; to: number }
  | { kind: 'rates' }

export type Citation = {
  dataset: string
  publisher: string
  href: string
  retrievedOn: string
  anchor: string
}

/** One entry in a section's sources: a committed dataset with any method, or a cited document. */
export type SectionSource =
  | (SourceRef & { computed?: string })
  | { kind: 'document'; source: DocumentSource }

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
    case 'fy-range':
      return `fy-${source.from}`
    case 'rates':
      return 'rates'
  }
}

/** A fiscal year as the FY total pay reports name it: FY2025-26 for 2026. */
export function fyLabel(fiscalYear: number): string {
  return `FY${fiscalYear - 1}-${String(fiscalYear).slice(2)}`
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

function citeFyRange(
  manifest: Manifest,
  { from, to }: { from: number; to: number },
): Citation {
  const entries = manifest.fy.filter(
    ({ fiscalYear }) => fiscalYear >= from && fiscalYear <= to,
  )
  const range =
    from === to ? fyLabel(from) : `${fyLabel(from)} to ${fyLabel(to)}`
  return {
    dataset: `${range} total pay reports`,
    publisher: DATA_ENABLEMENT,
    href: sharedSourcePage(entries, range),
    retrievedOn: latest(
      entries.flatMap((entry) => entry.files.map((file) => file.retrievedOn)),
    ),
    anchor: sourceAnchor({ kind: 'fy-range', from, to }),
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
    case 'fy-range':
      return citeFyRange(manifest, source)
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
  citations: number
}

/** Each distinct document the sources cite, in first-cited order, with its latest retrieval and how many sources cite it. */
export function listCitedDocuments(sources: CitedSource[]): CitedDocument[] {
  const documents = new Map<string, CitedDocument>()
  for (const source of sources) {
    const cited = documents.get(source.url)
    documents.set(source.url, {
      url: source.url,
      document: source.document,
      retrievedOn:
        cited && cited.retrievedOn > source.retrievedOn
          ? cited.retrievedOn
          : source.retrievedOn,
      citations: (cited?.citations ?? 0) + 1,
    })
  }
  return [...documents.values()]
}

/** A section's sources summary: "Source" or "Sources (n)", saying "and method" when a method is given or one source is computed. */
export function sourcesSummary(
  sources: SectionSource[],
  hasMethods: boolean,
): string {
  const method =
    hasMethods ||
    sources.some((source) => source.kind !== 'document' && source.computed)
      ? ' and method'
      : ''
  return sources.length === 1
    ? `Source${method}`
    : `Sources${method} (${sources.length})`
}

export function sectionSourceKey(source: SectionSource): string {
  return source.kind === 'document'
    ? sourceKey(source.source)
    : `${source.kind} ${sourceAnchor(source)}`
}

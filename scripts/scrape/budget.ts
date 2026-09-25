import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { BudgetEntry, Manifest } from '../../src/data/manifest.ts'
import { parseBudgetWorkbook, totalExpenditureCents } from './budget-file.ts'
import {
  BUDGET_REPORTS_PAGE,
  type BudgetLink,
  readBudgetLinks,
} from './budget-links.ts'
import { BUDGET_SOURCE_DIR, budgetDataPath, DATA_DIR } from './cache.ts'
import { fetchCached, politeFetch } from './fetch.ts'
import { type StepResult, sha256Hex } from './manifest-file.ts'

const MAX_FAILURES_LISTED = 20

async function importLink(link: BudgetLink): Promise<BudgetEntry> {
  const source = await fetchCached(
    link.url,
    path.join(BUDGET_SOURCE_DIR, link.fileName),
  )
  const parsed = parseBudgetWorkbook(
    new Uint8Array(source.bytes),
    link.fiscalYear,
    link.period,
  )
  if (parsed.kind === 'failed') {
    const { failures } = parsed
    const listed = failures
      .slice(0, MAX_FAILURES_LISTED)
      .map((failure) => `row ${failure.row}: ${failure.message}`)
    const more =
      failures.length > MAX_FAILURES_LISTED
        ? [`and ${failures.length - MAX_FAILURES_LISTED} more`]
        : []
    throw new Error(`${link.fileName}: ${[...listed, ...more].join('; ')}`)
  }
  const { year } = parsed
  await writeFile(budgetDataPath(link.fiscalYear), JSON.stringify(year))
  console.log(
    `budget FY${link.fiscalYear} PD${link.period}: ${year.rows.length} rows`,
  )
  return {
    fiscalYear: link.fiscalYear,
    period: link.period,
    sourcePage: BUDGET_REPORTS_PAGE,
    url: link.url,
    fileName: link.fileName,
    sha256: sha256Hex(source.bytes),
    lastModified: source.lastModified,
    retrievedOn: source.retrievedOn,
    rows: year.rows.length,
    totalExpenditureBudgetCents: totalExpenditureCents(year.rows),
  }
}

async function readLinks(): Promise<BudgetLink[]> {
  const response = await politeFetch(BUDGET_REPORTS_PAGE)
  if (!response.ok) {
    throw new Error(`GET ${BUDGET_REPORTS_PAGE} returned ${response.status}`)
  }
  return readBudgetLinks(await response.text(), BUDGET_REPORTS_PAGE)
}

export async function runBudget(manifest: Manifest): Promise<StepResult> {
  const links = await readLinks().catch((error: unknown) => String(error))
  if (typeof links === 'string') return { manifest, problems: [links] }
  await mkdir(path.join(DATA_DIR, 'budget'), { recursive: true })
  const problems: string[] = []
  const written = new Map<number, BudgetEntry>()
  for (const link of links) {
    try {
      written.set(link.fiscalYear, await importLink(link))
    } catch (error) {
      problems.push(String(error))
    }
  }
  const kept = manifest.budget.filter((entry) => !written.has(entry.fiscalYear))
  const budget = [...kept, ...written.values()].sort(
    (a, b) => a.fiscalYear - b.fiscalYear,
  )
  return { manifest: { ...manifest, budget }, problems }
}

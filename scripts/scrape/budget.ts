import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { BudgetEntry, Manifest } from '../../src/data/manifest.ts'
import { parseBudgetWorkbook } from './budget-file.ts'
import {
  BUDGET_REPORTS_PAGE,
  type BudgetLink,
  readBudgetLinks,
} from './budget-links.ts'
import { BUDGET_SOURCE_DIR, DATA_DIR } from './cache.ts'
import { politeFetch } from './fetch.ts'
import type { StepResult } from './manifest-file.ts'

const HTTP_NOT_MODIFIED = 304
const MAX_FAILURES_LISTED = 20

const cachedSourceSchema = z.strictObject({
  url: z.url(),
  lastModified: z.string().min(1),
  retrievedOn: z.iso.date(),
})
type CachedSource = z.infer<typeof cachedSourceSchema>

async function readCachedSource(file: string): Promise<CachedSource | null> {
  const sidecar = `${file}.json`
  if (!existsSync(file) || !existsSync(sidecar)) return null
  return cachedSourceSchema.parse(JSON.parse(await readFile(sidecar, 'utf8')))
}

async function download(
  link: BudgetLink,
): Promise<CachedSource & { bytes: Buffer }> {
  const file = path.join(BUDGET_SOURCE_DIR, link.fileName)
  const cached = await readCachedSource(file)
  const response = await politeFetch(
    link.url,
    cached ? { 'If-Modified-Since': cached.lastModified } : {},
  )
  if (cached && response.status === HTTP_NOT_MODIFIED) {
    return { ...cached, bytes: await readFile(file) }
  }
  if (!response.ok)
    throw new Error(`GET ${link.url} returned ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const source: CachedSource = {
    url: link.url,
    lastModified:
      response.headers.get('last-modified') ?? new Date().toUTCString(),
    retrievedOn: new Date().toLocaleDateString('en-CA'),
  }
  await mkdir(BUDGET_SOURCE_DIR, { recursive: true })
  await writeFile(file, bytes)
  await writeFile(`${file}.json`, `${JSON.stringify(source, null, 2)}\n`)
  return { ...source, bytes }
}

async function importLink(link: BudgetLink): Promise<BudgetEntry> {
  const source = await download(link)
  const { year, failures } = parseBudgetWorkbook(
    new Uint8Array(source.bytes),
    link.fiscalYear,
    link.period,
  )
  if (!year) {
    const listed = failures
      .slice(0, MAX_FAILURES_LISTED)
      .map((failure) => `row ${failure.row}: ${failure.message}`)
    const more =
      failures.length > MAX_FAILURES_LISTED
        ? [`and ${failures.length - MAX_FAILURES_LISTED} more`]
        : []
    throw new Error(`${link.fileName}: ${[...listed, ...more].join('; ')}`)
  }
  const fileLabel = `FY${String(link.fiscalYear).slice(2)}`
  await writeFile(
    path.join(DATA_DIR, 'budget', `${fileLabel}.json`),
    JSON.stringify(year),
  )
  console.log(`budget ${fileLabel} PD${link.period}: ${year.rows.length} rows`)
  return {
    fiscalYear: link.fiscalYear,
    period: link.period,
    sourcePage: BUDGET_REPORTS_PAGE,
    url: link.url,
    fileName: link.fileName,
    sha256: createHash('sha256').update(source.bytes).digest('hex'),
    lastModified: source.lastModified,
    retrievedOn: source.retrievedOn,
    rows: year.rows.length,
    totalExpenditureBudgetCents: year.rows.reduce(
      (sum, row) => sum + row.totalExpenditureBudgetCents,
      0,
    ),
  }
}

async function readLinks(): Promise<BudgetLink[]> {
  const response = await politeFetch(BUDGET_REPORTS_PAGE)
  if (!response.ok)
    throw new Error(`GET ${BUDGET_REPORTS_PAGE} returned ${response.status}`)
  const links = readBudgetLinks(await response.text(), BUDGET_REPORTS_PAGE)
  const years = links.map((link) => link.fiscalYear)
  if (new Set(years).size !== years.length)
    throw new Error(
      `more than one workbook for a fiscal year: ${years.join(', ')}`,
    )
  return links
}

export async function runBudget(manifest: Manifest): Promise<StepResult> {
  const problems: string[] = []
  let links: BudgetLink[] = []
  try {
    links = await readLinks()
  } catch (error) {
    return { manifest, problems: [String(error)] }
  }
  await mkdir(path.join(DATA_DIR, 'budget'), { recursive: true })
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

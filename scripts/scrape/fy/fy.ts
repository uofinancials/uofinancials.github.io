import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { staffKindSchema } from '../../../src/data/fall.ts'
import type { FyYear } from '../../../src/data/fy.ts'
import {
  type FyEntry,
  type Manifest,
  SALARY_REPORTS_PAGE,
} from '../../../src/data/manifest.ts'
import { DATA_DIR, FY_SOURCE_DIR, fyDataPath, listPdfs } from '../cache.ts'
import { type StepResult, sha256Hex, today } from '../manifest-file.ts'
import { type FyFile, parseFyFile } from './file.ts'

type SourcePdf = FyFile & {
  fileName: string
  sha256: string
  retrievedOn: string
}

async function readSource(file: string): Promise<SourcePdf | null> {
  const bytes = await readFile(file)
  const parsed = await parseFyFile(new Uint8Array(bytes))
  if (!parsed) return null
  const { mtime } = await stat(file)
  return {
    ...parsed,
    fileName: path.basename(file),
    sha256: sha256Hex(bytes),
    retrievedOn: today(mtime),
  }
}

function yearProblems(fiscalYear: number, sources: SourcePdf[]): string[] {
  const fileCounts = staffKindSchema.options.flatMap((kind) => {
    const count = sources.filter((source) => source.kind === kind).length
    return count === 1
      ? []
      : [`FY${fiscalYear}: ${count} ${kind} files, expected 1`]
  })
  const failures = sources.flatMap((source) =>
    source.failures.map(
      (failure) =>
        `${source.fileName} page ${failure.page}: ${failure.message}`,
    ),
  )
  return [...fileCounts, ...failures]
}

function toYearFile(fiscalYear: number, sources: SourcePdf[]): FyYear {
  const records = sources
    .flatMap((source) => source.records)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'en') ||
        a.kind.localeCompare(b.kind) ||
        a.sourcePage - b.sourcePage,
    )
  return { fiscalYear, records }
}

function toManifestEntry(fiscalYear: number, sources: SourcePdf[]): FyEntry {
  return {
    fiscalYear,
    sourcePage: SALARY_REPORTS_PAGE,
    files: sources
      .sort((a, b) => a.kind.localeCompare(b.kind))
      .map((source) => ({
        kind: source.kind,
        fileName: source.fileName,
        sha256: source.sha256,
        pages: source.pages,
        extractDate: source.extractDate,
        retrievedOn: source.retrievedOn,
        records: source.records.length,
      })),
  }
}

async function readSources(): Promise<{
  byYear: Map<number, SourcePdf[]>
  problems: string[]
}> {
  const byYear = new Map<number, SourcePdf[]>()
  const problems: string[] = []
  for (const file of await listPdfs(FY_SOURCE_DIR)) {
    try {
      const source = await readSource(file)
      if (!source) continue
      byYear.set(source.fiscalYear, [
        ...(byYear.get(source.fiscalYear) ?? []),
        source,
      ])
    } catch (error) {
      problems.push(`${path.basename(file)}: ${String(error)}`)
    }
  }
  return { byYear, problems }
}

export async function runFy(manifest: Manifest): Promise<StepResult> {
  const { byYear, problems } = await readSources()
  if (byYear.size === 0 && problems.length === 0) {
    problems.push(`no FY total pay reports found. Download them from
${SALARY_REPORTS_PAGE} into ${FY_SOURCE_DIR}`)
    return { manifest, problems }
  }
  const written = new Map<number, FyEntry>()
  await mkdir(path.join(DATA_DIR, 'fy'), { recursive: true })
  for (const [fiscalYear, sources] of [...byYear].sort(([a], [b]) => a - b)) {
    const yearIssues = yearProblems(fiscalYear, sources)
    if (yearIssues.length > 0) {
      problems.push(...yearIssues)
      continue
    }
    const yearFile = toYearFile(fiscalYear, sources)
    await writeFile(fyDataPath(fiscalYear), JSON.stringify(yearFile))
    written.set(fiscalYear, toManifestEntry(fiscalYear, sources))
    console.log(`fy ${fiscalYear}: ${yearFile.records.length} records`)
  }
  const kept = manifest.fy.filter((entry) => !written.has(entry.fiscalYear))
  const fy = [...kept, ...written.values()].sort(
    (a, b) => a.fiscalYear - b.fiscalYear,
  )
  return { manifest: { ...manifest, fy }, problems }
}

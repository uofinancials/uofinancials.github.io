import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type FallYear, staffKindSchema } from '../../src/data/fall.ts'
import {
  type FallEntry,
  type Manifest,
  SALARY_REPORTS_PAGE,
} from '../../src/data/manifest.ts'
import { DATA_DIR, FALL_SOURCE_DIR, listPdfs } from './cache.ts'
import { type FallFile, parseFallFile } from './fall-file.ts'
import type { StepResult } from './manifest-file.ts'

type SourcePdf = FallFile & {
  fileName: string
  sha256: string
  retrievedOn: string
}

async function readSource(file: string): Promise<SourcePdf> {
  const bytes = await readFile(file)
  const { mtime } = await stat(file)
  return {
    ...(await parseFallFile(new Uint8Array(bytes))),
    fileName: path.basename(file),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    retrievedOn: mtime.toLocaleDateString('en-CA'),
  }
}

function yearProblems(censusDate: string, sources: SourcePdf[]): string[] {
  const fileCounts = staffKindSchema.options.flatMap((kind) => {
    const count = sources.filter((source) => source.kind === kind).length
    return count === 1
      ? []
      : [`${censusDate}: ${count} ${kind} files, expected 1`]
  })
  const failures = sources.flatMap((source) =>
    source.failures.map(
      (failure) =>
        `${source.fileName} page ${failure.page}: ${failure.message}`,
    ),
  )
  return [...fileCounts, ...failures]
}

function toYearFile(censusDate: string, sources: SourcePdf[]): FallYear {
  const records = sources
    .flatMap((source) => source.records)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'en') ||
        a.kind.localeCompare(b.kind) ||
        a.sourcePage - b.sourcePage,
    )
  return { censusDate, records }
}

function toManifestEntry(censusDate: string, sources: SourcePdf[]): FallEntry {
  return {
    year: Number(censusDate.slice(0, 4)),
    censusDate,
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
        possibleStudents: source.records.filter(
          (record) => record.possibleStudent,
        ).length,
      })),
  }
}

async function readSources(): Promise<{
  byCensus: Map<string, SourcePdf[]>
  problems: string[]
}> {
  const byCensus = new Map<string, SourcePdf[]>()
  const problems: string[] = []
  for (const file of await listPdfs(FALL_SOURCE_DIR)) {
    try {
      const source = await readSource(file)
      byCensus.set(source.censusDate, [
        ...(byCensus.get(source.censusDate) ?? []),
        source,
      ])
    } catch (error) {
      problems.push(`${path.basename(file)}: ${String(error)}`)
    }
  }
  return { byCensus, problems }
}

export async function runFall(manifest: Manifest): Promise<StepResult> {
  const { byCensus, problems } = await readSources()
  if (byCensus.size === 0 && problems.length === 0) {
    problems.push(`no PDFs found. Download the Fall Census reports from
${SALARY_REPORTS_PAGE} into ${FALL_SOURCE_DIR}`)
    return { manifest, problems }
  }
  const written = new Map<number, FallEntry>()
  await mkdir(path.join(DATA_DIR, 'fall'), { recursive: true })
  for (const [censusDate, sources] of [...byCensus].sort()) {
    const yearIssues = yearProblems(censusDate, sources)
    if (yearIssues.length > 0) {
      problems.push(...yearIssues)
      continue
    }
    const entry = toManifestEntry(censusDate, sources)
    const yearFile = toYearFile(censusDate, sources)
    await writeFile(
      path.join(DATA_DIR, 'fall', `${entry.year}.json`),
      JSON.stringify(yearFile),
    )
    written.set(entry.year, entry)
    console.log(`fall ${entry.year}: ${yearFile.records.length} records`)
  }
  const kept = manifest.fall.filter((entry) => !written.has(entry.year))
  const fall = [...kept, ...written.values()].sort((a, b) => a.year - b.year)
  return { manifest: { ...manifest, fall }, problems }
}

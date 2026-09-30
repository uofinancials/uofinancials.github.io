import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { type StaffKind, staffKindSchema } from '../../src/data/fall.ts'
import type { FallEntry } from '../../src/data/manifest.ts'
import { sha256Hex, today } from './manifest-file.ts'
import type { PageFailure } from './pdf/blocks.ts'

/** What a salary report parser returns for one file. */
export type ParsedReport<Row> = {
  kind: StaffKind
  extractDate: string
  pages: number
  records: Row[]
  failures: PageFailure[]
}

export type SourcePdf<Report> = Report & {
  fileName: string
  sha256: string
  retrievedOn: string
}

type SortableRow = { name: string; kind: StaffKind; sourcePage: number }

/** A downloaded report parsed, with the file facts the manifest cites; `null` where the parser skips it. */
export async function readSourcePdf<Report>(
  file: string,
  parse: (bytes: Uint8Array) => Promise<Report | null>,
): Promise<SourcePdf<Report> | null> {
  const bytes = await readFile(file)
  const parsed = await parse(new Uint8Array(bytes))
  if (!parsed) return null
  const { mtime } = await stat(file)
  return {
    ...parsed,
    fileName: path.basename(file),
    sha256: sha256Hex(bytes),
    retrievedOn: today(mtime),
  }
}

/** One file per report kind for a year, and each file's parse failures. */
export function sourceProblems(
  year: string,
  sources: SourcePdf<ParsedReport<unknown>>[],
): string[] {
  const fileCounts = staffKindSchema.options.flatMap((kind) => {
    const count = sources.filter((source) => source.kind === kind).length
    return count === 1 ? [] : [`${year}: ${count} ${kind} files, expected 1`]
  })
  const failures = sources.flatMap((source) =>
    source.failures.map(
      (failure) =>
        `${source.fileName} page ${failure.page}: ${failure.message}`,
    ),
  )
  return [...fileCounts, ...failures]
}

/** A year's records from all its files, by name, then kind, then page. */
export function sortedRecords<Row extends SortableRow>(
  sources: SourcePdf<ParsedReport<Row>>[],
): Row[] {
  return sources
    .flatMap((source) => source.records)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'en') ||
        a.kind.localeCompare(b.kind) ||
        a.sourcePage - b.sourcePage,
    )
}

export function manifestFiles(
  sources: SourcePdf<ParsedReport<unknown>>[],
): FallEntry['files'] {
  return [...sources]
    .sort((a, b) => a.kind.localeCompare(b.kind))
    .map((source) => ({
      kind: source.kind,
      fileName: source.fileName,
      sha256: source.sha256,
      pages: source.pages,
      extractDate: source.extractDate,
      retrievedOn: source.retrievedOn,
      records: source.records.length,
    }))
}

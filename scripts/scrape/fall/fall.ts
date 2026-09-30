import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { censusYearOf, type FallYear } from '../../../src/data/fall.ts'
import {
  type FallEntry,
  type Manifest,
  SALARY_REPORTS_PAGE,
} from '../../../src/data/manifest.ts'
import { DATA_DIR, FALL_SOURCE_DIR, fallDataPath, listPdfs } from '../cache.ts'
import type { StepResult } from '../manifest-file.ts'
import {
  manifestFiles,
  readSourcePdf,
  type SourcePdf,
  sortedRecords,
  sourceProblems,
} from '../source-pdfs.ts'
import { type FallFile, parseFallFile } from './file.ts'

async function readSources(): Promise<{
  byCensus: Map<string, SourcePdf<FallFile>[]>
  problems: string[]
}> {
  const byCensus = new Map<string, SourcePdf<FallFile>[]>()
  const problems: string[] = []
  for (const file of await listPdfs(FALL_SOURCE_DIR)) {
    try {
      const source = await readSourcePdf(file, parseFallFile)
      if (!source) continue
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
    const yearIssues = sourceProblems(censusDate, sources)
    if (yearIssues.length > 0) {
      problems.push(...yearIssues)
      continue
    }
    const year = censusYearOf(censusDate)
    const records = sortedRecords(sources)
    await writeFile(
      fallDataPath(year),
      JSON.stringify({ censusDate, records } satisfies FallYear),
    )
    written.set(year, {
      year,
      censusDate,
      sourcePage: SALARY_REPORTS_PAGE,
      files: manifestFiles(sources),
    })
    console.log(`fall ${year}: ${records.length} records`)
  }
  const kept = manifest.fall.filter((entry) => !written.has(entry.year))
  const fall = [...kept, ...written.values()].sort((a, b) => a.year - b.year)
  return { manifest: { ...manifest, fall }, problems }
}

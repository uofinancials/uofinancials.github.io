import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { FyYear } from '../../../src/data/fy.ts'
import {
  type FyEntry,
  type Manifest,
  SALARY_REPORTS_PAGE,
} from '../../../src/data/manifest.ts'
import { DATA_DIR, FY_SOURCE_DIR, fyDataPath, listPdfs } from '../cache.ts'
import type { StepResult } from '../manifest-file.ts'
import {
  manifestFiles,
  readSourcePdf,
  type SourcePdf,
  sortedRecords,
  sourceProblems,
} from '../source-pdfs.ts'
import { type FyFile, parseFyFile } from './file.ts'

async function readSources(): Promise<{
  byYear: Map<number, SourcePdf<FyFile>[]>
  problems: string[]
}> {
  const byYear = new Map<number, SourcePdf<FyFile>[]>()
  const problems: string[] = []
  for (const file of await listPdfs(FY_SOURCE_DIR)) {
    try {
      const source = await readSourcePdf(file, parseFyFile)
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
    const yearIssues = sourceProblems(`FY${fiscalYear}`, sources)
    if (yearIssues.length > 0) {
      problems.push(...yearIssues)
      continue
    }
    const records = sortedRecords(sources)
    await writeFile(
      fyDataPath(fiscalYear),
      JSON.stringify({ fiscalYear, records } satisfies FyYear),
    )
    written.set(fiscalYear, {
      fiscalYear,
      sourcePage: SALARY_REPORTS_PAGE,
      files: manifestFiles(sources),
    })
    console.log(`fy ${fiscalYear}: ${records.length} records`)
  }
  const kept = manifest.fy.filter((entry) => !written.has(entry.fiscalYear))
  const fy = [...kept, ...written.values()].sort(
    (a, b) => a.fiscalYear - b.fiscalYear,
  )
  return { manifest: { ...manifest, fy }, problems }
}

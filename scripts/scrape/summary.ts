import { existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { budgetYearSchema } from '../../src/data/budget.ts'
import { fallYearSchema } from '../../src/data/fall.ts'
import type { Manifest } from '../../src/data/manifest.ts'
import { opeRatesSchema } from '../../src/data/ope.ts'
import { outlookSchema } from '../../src/data/outlook.ts'
import { raiseTermsSchema } from '../../src/data/raises.ts'
import { type Summary, summarySchema } from '../../src/data/summary.ts'
import { buildSummary } from '../../src/lib/summary/summary.ts'
import {
  budgetDataPath,
  DATA_DIR,
  fallDataPath,
  OPE_DATA_PATH,
  OUTLOOK_DATA_PATH,
  RAISES_DATA_PATH,
  readJson,
  SUMMARY_DATA_PATH,
} from './cache.ts'
import { type StepResult, today } from './manifest-file.ts'

/** The summary of the committed data files the manifest lists, and those files relative to the data directory. */
export function deriveSummary(manifest: Manifest): {
  summary: Summary
  files: string[]
} {
  const fallPaths = manifest.fall.map(({ year }) => fallDataPath(year))
  const budgetPaths = manifest.budget.map(({ fiscalYear }) =>
    budgetDataPath(fiscalYear),
  )
  const summary = buildSummary({
    manifest,
    falls: fallPaths.map((file) => fallYearSchema.parse(readJson(file))),
    budgets: budgetPaths.map((file) => budgetYearSchema.parse(readJson(file))),
    outlook: outlookSchema.parse(readJson(OUTLOOK_DATA_PATH)),
    rates: opeRatesSchema.parse(readJson(OPE_DATA_PATH)),
    raiseTerms: raiseTermsSchema.parse(readJson(RAISES_DATA_PATH)),
  })
  const files = [
    ...fallPaths,
    ...budgetPaths,
    OUTLOOK_DATA_PATH,
    OPE_DATA_PATH,
    RAISES_DATA_PATH,
  ].map((file) => path.relative(DATA_DIR, file))
  return { summary, files }
}

export function serializeSummary(summary: Summary): string {
  return `${JSON.stringify(summarySchema.parse(summary))}\n`
}

/** Writes the summary; the manifest's derivation date moves only when the file or its inputs change. */
export async function runSummary(manifest: Manifest): Promise<StepResult> {
  const { summary, files } = deriveSummary(manifest)
  const text = serializeSummary(summary)
  const isUnchanged =
    existsSync(SUMMARY_DATA_PATH) &&
    readFileSync(SUMMARY_DATA_PATH, 'utf8') === text &&
    JSON.stringify(manifest.summary?.files) === JSON.stringify(files)
  if (isUnchanged) return { manifest, problems: [] }
  await writeFile(SUMMARY_DATA_PATH, text)
  return {
    manifest: { ...manifest, summary: { derivedOn: today(), files } },
    problems: [],
  }
}

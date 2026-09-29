import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Manifest } from '../../src/data/manifest.ts'
import { opeRatesSchema } from '../../src/data/ope.ts'
import { outlookSchema } from '../../src/data/outlook.ts'
import { raiseTermsSchema } from '../../src/data/raises.ts'
import type { AreaTrends } from '../../src/data/summary.ts'
import {
  areaTrendsSchema,
  type Summary,
  summarySchema,
} from '../../src/data/summary.ts'
import {
  foldedBudgetYearSchema,
  foldedFallYearSchema,
} from '../../src/data/unit-aliases.ts'
import {
  buildSummary,
  buildTrendScopes,
  type SummaryInputs,
} from '../../src/lib/summary/summary.ts'
import {
  AREA_TRENDS_DIR,
  areaTrendsPath,
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

/** The summary and each area's trends, derived from the committed data files the manifest lists, and those files relative to the data directory. */
export function deriveSummary(manifest: Manifest): {
  summary: Summary
  areas: AreaTrends[]
  files: string[]
} {
  const fallPaths = manifest.fall.map(({ year }) => fallDataPath(year))
  const budgetPaths = manifest.budget.map(({ fiscalYear }) =>
    budgetDataPath(fiscalYear),
  )
  const inputs: SummaryInputs = {
    manifest,
    falls: fallPaths.map((file) => foldedFallYearSchema.parse(readJson(file))),
    budgets: budgetPaths.map((file) =>
      foldedBudgetYearSchema.parse(readJson(file)),
    ),
    outlook: outlookSchema.parse(readJson(OUTLOOK_DATA_PATH)),
    rates: opeRatesSchema.parse(readJson(OPE_DATA_PATH)),
    raiseTerms: raiseTermsSchema.parse(readJson(RAISES_DATA_PATH)),
  }
  const files = [
    ...fallPaths,
    ...budgetPaths,
    OUTLOOK_DATA_PATH,
    OPE_DATA_PATH,
    RAISES_DATA_PATH,
  ].map((file) => path.relative(DATA_DIR, file))
  const scopes = buildTrendScopes(inputs)
  return {
    summary: buildSummary(inputs, scopes),
    areas: scopes.areas,
    files,
  }
}

/** Each derived file's text by its path: the summary, then one file per area. */
export function serializeDerived(
  summary: Summary,
  areas: AreaTrends[],
): Map<string, string> {
  return new Map([
    [SUMMARY_DATA_PATH, `${JSON.stringify(summarySchema.parse(summary))}\n`],
    ...areas.map((area): [string, string] => [
      areaTrendsPath(area.code),
      `${JSON.stringify(areaTrendsSchema.parse(area))}\n`,
    ]),
  ])
}

export function listAreaTrendsFiles(): string[] {
  return existsSync(AREA_TRENDS_DIR)
    ? readdirSync(AREA_TRENDS_DIR).map((name) =>
        path.join(AREA_TRENDS_DIR, name),
      )
    : []
}

function isOnDisk(texts: Map<string, string>): boolean {
  const areaFiles = listAreaTrendsFiles()
  return (
    areaFiles.every((file) => texts.has(file)) &&
    [...texts].every(
      ([file, text]) => existsSync(file) && readFileSync(file, 'utf8') === text,
    )
  )
}

/** Writes the summary and the area trends files, replacing any area file no longer derived; the manifest's derivation date moves only when a file or its inputs change. */
export async function runSummary(manifest: Manifest): Promise<StepResult> {
  const { summary, areas, files } = deriveSummary(manifest)
  const texts = serializeDerived(summary, areas)
  const isUnchanged =
    isOnDisk(texts) &&
    JSON.stringify(manifest.summary?.files) === JSON.stringify(files)
  if (isUnchanged) return { manifest, problems: [] }
  await rm(AREA_TRENDS_DIR, { recursive: true, force: true })
  await mkdir(AREA_TRENDS_DIR)
  await Promise.all([...texts].map(([file, text]) => writeFile(file, text)))
  return {
    manifest: { ...manifest, summary: { derivedOn: today(), files } },
    problems: [],
  }
}

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { z } from 'zod'
import {
  type DepartmentFile,
  departmentFileSchema,
} from '../../src/data/department.ts'
import { fallYearSchema } from '../../src/data/fall.ts'
import { fyYearSchema } from '../../src/data/fy.ts'
import { type FyTemps, fyTempsSchema } from '../../src/data/fy-temps.ts'
import type { Manifest } from '../../src/data/manifest.ts'
import { opeRatesSchema } from '../../src/data/ope.ts'
import { outlookSchema } from '../../src/data/outlook.ts'
import {
  type PersonBucket,
  personBucketSchema,
} from '../../src/data/person-bucket.ts'
import { raiseTermsSchema } from '../../src/data/raises.ts'
import type { AreaTrends } from '../../src/data/summary.ts'
import {
  areaTrendsSchema,
  departmentsSchema,
  homeSchema,
  peerMediansSchema,
  peopleNamesSchema,
  type Summary,
  trendsSummarySchema,
} from '../../src/data/summary.ts'
import {
  foldedBudgetYearSchema,
  foldUnitAliases,
} from '../../src/data/unit-aliases.ts'
import { buildDepartmentFiles } from '../../src/lib/departments/department-file.ts'
import { buildFyTemps } from '../../src/lib/departments/fy-temps.ts'
import { toDepartmentCensuses } from '../../src/lib/departments/jobs.ts'
import { buildPersonBuckets } from '../../src/lib/people/person-buckets.ts'
import {
  buildSummary,
  buildTrendScopes,
  type SummaryInputs,
} from '../../src/lib/summary/summary.ts'
import {
  areaTrendsPath,
  budgetDataPath,
  DATA_DIR,
  DEPARTMENTS_DATA_PATH,
  DERIVED_DIRS,
  departmentPath,
  FY_TEMPS_DATA_PATH,
  fallDataPath,
  fyDataPath,
  HOME_DATA_PATH,
  OPE_DATA_PATH,
  OUTLOOK_DATA_PATH,
  PEER_MEDIANS_PATH,
  PEOPLE_NAMES_PATH,
  personBucketPath,
  RAISES_DATA_PATH,
  readJson,
  TRENDS_DATA_PATH,
} from './cache.ts'
import { type StepResult, today } from './manifest-file.ts'

type Derived = {
  summary: Summary
  areas: AreaTrends[]
  departments: DepartmentFile[]
  buckets: Map<string, PersonBucket>
  fyTemps: FyTemps
}

/** The summaries, each area's trends, each department page, the people in each name bucket and temporaries' FY pay, derived from the committed data files the manifest lists, and those files relative to the data directory. */
export function deriveSummary(manifest: Manifest): Derived & {
  files: string[]
} {
  const fallPaths = manifest.fall.map(({ year }) => fallDataPath(year))
  const budgetPaths = manifest.budget.map(({ fiscalYear }) =>
    budgetDataPath(fiscalYear),
  )
  const fyPaths = manifest.fy.map(({ fiscalYear }) => fyDataPath(fiscalYear))
  const published = fallPaths.map((file) =>
    fallYearSchema.parse(readJson(file)),
  )
  const base = {
    manifest,
    falls: published.map(foldUnitAliases),
    budgets: budgetPaths.map((file) =>
      foldedBudgetYearSchema.parse(readJson(file)),
    ),
    outlook: outlookSchema.parse(readJson(OUTLOOK_DATA_PATH)),
    rates: opeRatesSchema.parse(readJson(OPE_DATA_PATH)),
    raiseTerms: raiseTermsSchema.parse(readJson(RAISES_DATA_PATH)),
  }
  const fyTemps = buildFyTemps({
    ...base,
    fys: fyPaths.map((file) => fyYearSchema.parse(readJson(file))),
  })
  const inputs: SummaryInputs = { ...base, fyTemps }
  const files = [
    ...fallPaths,
    ...budgetPaths,
    ...fyPaths,
    OUTLOOK_DATA_PATH,
    OPE_DATA_PATH,
    RAISES_DATA_PATH,
  ].map((file) => path.relative(DATA_DIR, file))
  const scopes = buildTrendScopes(inputs)
  const summary = buildSummary(inputs, scopes)
  return {
    summary,
    areas: scopes.areas,
    departments: buildDepartmentFiles(summary.departments.codes, {
      censuses: toDepartmentCensuses(manifest, base.falls, base.budgets),
      budgets: base.budgets,
      fyTemps,
    }),
    buckets: buildPersonBuckets(base.falls, published),
    fyTemps,
    files,
  }
}

function fileText<T>(schema: z.ZodType<T>, value: T): string {
  return `${JSON.stringify(schema.parse(value))}\n`
}

/** Each derived file's text by its path: the pages' summaries, temporaries' FY pay, then one file per area, per department page and per name bucket. */
export function serializeDerived({
  summary,
  areas,
  departments,
  buckets,
  fyTemps,
}: Derived): Map<string, string> {
  return new Map([
    [HOME_DATA_PATH, fileText(homeSchema, summary.home)],
    [TRENDS_DATA_PATH, fileText(trendsSummarySchema, summary.trends)],
    [DEPARTMENTS_DATA_PATH, fileText(departmentsSchema, summary.departments)],
    [PEOPLE_NAMES_PATH, fileText(peopleNamesSchema, summary.people.names)],
    [PEER_MEDIANS_PATH, fileText(peerMediansSchema, summary.people.medians)],
    [FY_TEMPS_DATA_PATH, fileText(fyTempsSchema, fyTemps)],
    ...areas.map((area): [string, string] => [
      areaTrendsPath(area.code),
      fileText(areaTrendsSchema, area),
    ]),
    ...departments.map((file): [string, string] => [
      departmentPath(file.profile.code),
      fileText(departmentFileSchema, file),
    ]),
    ...[...buckets].map(([id, bucket]): [string, string] => [
      personBucketPath(id),
      fileText(personBucketSchema, bucket),
    ]),
  ])
}

/** Every file in the data directory, or in the directories under it this step owns. */
export function listDataFiles(dirs: string[] = [DATA_DIR]): string[] {
  return dirs.flatMap((dir) =>
    existsSync(dir)
      ? readdirSync(dir, { recursive: true, withFileTypes: true })
          .filter((entry) => entry.isFile())
          .map((entry) => path.join(entry.parentPath, entry.name))
      : [],
  )
}

function isOnDisk(texts: Map<string, string>): boolean {
  return (
    listDataFiles(DERIVED_DIRS).every((file) => texts.has(file)) &&
    [...texts].every(
      ([file, text]) => existsSync(file) && readFileSync(file, 'utf8') === text,
    )
  )
}

/** Writes the derived files, replacing every file in the directories this step owns; the manifest's derivation date moves only when a file or its inputs change. */
export async function runSummary(manifest: Manifest): Promise<StepResult> {
  const derived = deriveSummary(manifest)
  const texts = serializeDerived(derived)
  const isUnchanged =
    isOnDisk(texts) &&
    JSON.stringify(manifest.summary?.files) === JSON.stringify(derived.files)
  if (isUnchanged) return { manifest, problems: [] }
  await Promise.all(
    DERIVED_DIRS.map((dir) => rm(dir, { recursive: true, force: true })),
  )
  await Promise.all(
    [...new Set([...texts.keys()].map(path.dirname))].map((dir) =>
      mkdir(dir, { recursive: true }),
    ),
  )
  await Promise.all([...texts].map(([file, text]) => writeFile(file, text)))
  return {
    manifest: {
      ...manifest,
      summary: { derivedOn: today(), files: derived.files },
    },
    problems: [],
  }
}

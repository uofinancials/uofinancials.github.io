import { existsSync, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fiscalYearLabel } from '../../src/data/budget.ts'

export const FALL_SOURCE_DIR = path.resolve(
  import.meta.dirname,
  '../../.cache/sources/fall',
)

export const hasFallSources = existsSync(FALL_SOURCE_DIR)

export const FY_SOURCE_DIR = path.resolve(
  import.meta.dirname,
  '../../.cache/sources/fy',
)

export const hasFySources = existsSync(FY_SOURCE_DIR)

export const BUDGET_SOURCE_DIR = path.resolve(
  import.meta.dirname,
  '../../.cache/sources/budget',
)

export const hasBudgetSources = existsSync(BUDGET_SOURCE_DIR)

export const RATES_SOURCE_DIR = path.resolve(
  import.meta.dirname,
  '../../.cache/sources/rates',
)

export const hasRatesSources = existsSync(RATES_SOURCE_DIR)

export function ratesSourcePath(page: string): string {
  return path.join(RATES_SOURCE_DIR, `${page}.html`)
}

export const DATA_DIR = path.resolve(import.meta.dirname, '../../public/data')

export function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'))
}
export const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json')
export const OPE_DATA_PATH = path.join(DATA_DIR, 'ope.json')
export const RAISES_DATA_PATH = path.join(DATA_DIR, 'raises.json')
export const OUTLOOK_DATA_PATH = path.join(DATA_DIR, 'outlook.json')
export const FY_TEMPS_DATA_PATH = path.join(DATA_DIR, 'fy-temps.json')
export const HOME_DATA_PATH = path.join(DATA_DIR, 'home.json')
export const TRENDS_DATA_PATH = path.join(DATA_DIR, 'trends.json')
export const DEPARTMENTS_DATA_PATH = path.join(DATA_DIR, 'departments.json')
export const PAY_CHANGES_DATA_PATH = path.join(DATA_DIR, 'pay-changes.json')

const AREA_TRENDS_DIR = path.join(DATA_DIR, 'trends')
export const DEPARTMENTS_DIR = path.join(DATA_DIR, 'departments')

export function departmentPath(code: string): string {
  return path.join(DEPARTMENTS_DIR, `${code}.json`)
}

const PEOPLE_DIR = path.join(DATA_DIR, 'people')
export const PEOPLE_NAMES_PATH = path.join(PEOPLE_DIR, 'names.json')
export const PEER_MEDIANS_PATH = path.join(PEOPLE_DIR, 'medians.json')
export const PERSON_BUCKETS_DIR = path.join(PEOPLE_DIR, 'buckets')

export function personBucketPath(bucket: string): string {
  return path.join(PERSON_BUCKETS_DIR, `${bucket}.json`)
}

/** The directories `pnpm scrape summary` owns: it writes every file in them. */
export const DERIVED_DIRS = [AREA_TRENDS_DIR, DEPARTMENTS_DIR, PEOPLE_DIR]

export function areaTrendsPath(code: string): string {
  return path.join(AREA_TRENDS_DIR, `${code}.json`)
}

export function fallDataPath(year: number): string {
  return path.join(DATA_DIR, 'fall', `${year}.json`)
}

export function fyDataPath(fiscalYear: number): string {
  return path.join(DATA_DIR, 'fy', `${fiscalYear}.json`)
}

export function budgetDataPath(fiscalYear: number): string {
  return path.join(DATA_DIR, 'budget', `${fiscalYearLabel(fiscalYear)}.json`)
}

export async function listPdfs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && /\.pdf$/i.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
}

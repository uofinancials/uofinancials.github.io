import { existsSync, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fiscalYearLabel } from '../../src/data/budget.ts'

export const FALL_SOURCE_DIR = path.resolve(
  import.meta.dirname,
  '../../.cache/sources/fall',
)

export const hasFallSources = existsSync(FALL_SOURCE_DIR)

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

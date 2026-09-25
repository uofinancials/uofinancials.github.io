import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

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

export const DATA_DIR = path.resolve(import.meta.dirname, '../../public/data')
export const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json')

export async function listPdfs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && /\.pdf$/i.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
}

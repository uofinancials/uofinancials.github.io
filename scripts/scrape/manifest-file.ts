import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { type Manifest, manifestSchema } from '../../src/data/manifest.ts'
import { MANIFEST_PATH } from './cache.ts'
import type { CachedSource } from './fetch.ts'

export type StepResult = { manifest: Manifest; problems: string[] }

export async function readManifest(): Promise<Manifest> {
  if (!existsSync(MANIFEST_PATH)) return { fall: [], budget: [], rates: null }
  return manifestSchema.parse(JSON.parse(await readFile(MANIFEST_PATH, 'utf8')))
}

export async function writeManifest(manifest: Manifest): Promise<void> {
  const validated = manifestSchema.parse(manifest)
  await writeFile(MANIFEST_PATH, `${JSON.stringify(validated, null, 2)}\n`)
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export function today(date = new Date()): string {
  return date.toLocaleDateString('en-CA')
}

export function fetchedFile(source: CachedSource) {
  return {
    url: source.url,
    sha256: sha256Hex(source.bytes),
    lastModified: source.lastModified,
    retrievedOn: source.retrievedOn,
  }
}

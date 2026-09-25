import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { type Manifest, manifestSchema } from '../../src/data/manifest.ts'
import { MANIFEST_PATH } from './cache.ts'

export type StepResult = { manifest: Manifest; problems: string[] }

export async function readManifest(): Promise<Manifest> {
  if (!existsSync(MANIFEST_PATH)) return manifestSchema.parse({ fall: [] })
  return manifestSchema.parse(JSON.parse(await readFile(MANIFEST_PATH, 'utf8')))
}

export async function writeManifest(manifest: Manifest): Promise<void> {
  const validated = manifestSchema.parse(manifest)
  await writeFile(MANIFEST_PATH, `${JSON.stringify(validated, null, 2)}\n`)
}

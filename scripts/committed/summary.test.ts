import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { manifestSchema } from '../../src/data/manifest.ts'
import { DATA_DIR, MANIFEST_PATH, readJson } from '../scrape/cache.ts'
import {
  deriveSummary,
  listDataFiles,
  serializeDerived,
} from '../scrape/summary.ts'

/** The files in the data directory that are neither a source's data nor derived from it. */
const OTHER_FILES = ['LICENSE', 'manifest.json']

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the committed derived files are what the committed data files derive, and the data directory holds no other file; run `pnpm scrape summary` if not',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const derived = deriveSummary(manifest)
    const texts = serializeDerived(derived)
    for (const [file, text] of texts) {
      expect(JSON.parse(readFileSync(file, 'utf8')), file).toEqual(
        JSON.parse(text),
      )
    }
    const known = new Set([
      ...OTHER_FILES,
      ...derived.files,
      ...[...texts.keys()].map((file) => path.relative(DATA_DIR, file)),
    ])
    expect(
      listDataFiles()
        .map((file) => path.relative(DATA_DIR, file))
        .filter((file) => !known.has(file)),
    ).toEqual([])
    expect(manifest.summary?.files).toEqual(derived.files)
  },
  30_000,
)

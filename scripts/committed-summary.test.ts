import { existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { manifestSchema } from '../src/data/manifest.ts'
import { MANIFEST_PATH, readJson, SUMMARY_DATA_PATH } from './scrape/cache.ts'
import { deriveSummary, serializeSummary } from './scrape/summary.ts'

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the committed summary is what the committed data files derive; run `pnpm scrape summary` if not',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const { summary, files } = deriveSummary(manifest)
    expect(readJson(SUMMARY_DATA_PATH)).toEqual(
      JSON.parse(serializeSummary(summary)),
    )
    expect(manifest.summary?.files).toEqual(files)
  },
  30_000,
)

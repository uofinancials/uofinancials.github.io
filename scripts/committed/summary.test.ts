import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { manifestSchema } from '../../src/data/manifest.ts'
import { MANIFEST_PATH, readJson } from '../scrape/cache.ts'
import {
  deriveSummary,
  listAreaTrendsFiles,
  serializeDerived,
} from '../scrape/summary.ts'

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the committed summary, area trends and temporaries’ FY pay are what the committed data files derive; run `pnpm scrape summary` if not',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const { summary, areas, fyTemps, files } = deriveSummary(manifest)
    const texts = serializeDerived(summary, areas, fyTemps)
    for (const [file, text] of texts) {
      expect(JSON.parse(readFileSync(file, 'utf8')), file).toEqual(
        JSON.parse(text),
      )
    }
    expect(listAreaTrendsFiles().filter((file) => !texts.has(file))).toEqual([])
    expect(manifest.summary?.files).toEqual(files)
  },
  30_000,
)

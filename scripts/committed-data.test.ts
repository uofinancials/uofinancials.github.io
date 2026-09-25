import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { fallYearSchema } from '../src/data/fall.ts'
import { manifestSchema } from '../src/data/manifest.ts'
import { DATA_DIR, MANIFEST_PATH } from './scrape/cache.ts'

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'))
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every committed Fall year matches its schema and its manifest entry',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    for (const entry of manifest.fall) {
      const year = fallYearSchema.parse(
        readJson(path.join(DATA_DIR, 'fall', `${entry.year}.json`)),
      )
      const expected = entry.files.reduce((sum, file) => sum + file.records, 0)
      expect(year.censusDate).toBe(entry.censusDate)
      expect(year.records.length).toBe(expected)
    }
  },
)

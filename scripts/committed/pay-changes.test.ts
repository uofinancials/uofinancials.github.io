import { existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { fallYearSchema } from '../../src/data/fall.ts'
import { manifestSchema } from '../../src/data/manifest.ts'
import { payChangesFileSchema } from '../../src/data/pay-changes.ts'
import {
  areaTrendsSchema,
  trendsSummarySchema,
} from '../../src/data/summary.ts'
import { decodePairs } from '../../src/lib/trends/pair-file.ts'
import {
  changeCounts,
  payChangeTrends,
} from '../../src/lib/trends/pay-changes.ts'
import { pairYears } from '../../src/lib/trends/trends.ts'
import {
  areaTrendsPath,
  fallDataPath,
  MANIFEST_PATH,
  PAY_CHANGES_DATA_PATH,
  readJson,
  TRENDS_DATA_PATH,
} from '../scrape/cache.ts'

/** Parsing every census for its names takes a few seconds alone, more beside other test files. */
const ALL_RECORDS_TIMEOUT_MS = 30_000

function readCommitted() {
  const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
  const file = payChangesFileSchema.parse(readJson(PAY_CHANGES_DATA_PATH))
  const years = manifest.fall.map(({ year }) => year)
  return {
    manifest,
    file,
    pairs: decodePairs(file),
    fromYears: pairYears(years, Math.min(...years), Math.max(...years)),
  }
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the pay changes file gives the median change the trends files hold for all of UO, every area, and every unit',
  () => {
    const { pairs, fromYears } = readCommitted()
    const trends = trendsSummarySchema.parse(readJson(TRENDS_DATA_PATH))
    expect(payChangeTrends(pairs, fromYears, null)).toEqual(trends.payChanges)
    for (const { code } of trends.areas) {
      const area = areaTrendsSchema.parse(readJson(areaTrendsPath(code)))
      expect(
        payChangeTrends(
          pairs.filter((pair) => pair.area === code),
          fromYears,
          null,
        ),
        code,
      ).toEqual(area.payChanges)
      for (const unit of area.units) {
        expect(
          payChangeTrends(
            pairs.filter((pair) => pair.dept === unit.code),
            fromYears,
            null,
          ),
          unit.code,
        ).toEqual(unit.payChanges)
      }
    }
  },
)

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the pay changes file holds the Fall 2024-25 pairs an independent computation counts',
  () => {
    const { pairs } = readCommitted()
    expect(pairs).toHaveLength(52_109)
    expect(changeCounts(pairs, [2024])[0]).toMatchObject({
      pairs: 5_203,
      unclassified: 3_359,
      rankChanged: 171,
      rankUnpublished: 0,
      classified: 1_844,
      classChanged: 59,
    })
  },
)

/** Every string the file holds, at any depth. */
function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (typeof value !== 'object' || value === null) return []
  return Object.values(value).flatMap(stringsIn)
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the pay changes file holds no name a census publishes',
  () => {
    const { manifest, file } = readCommitted()
    const names = new Set(
      manifest.fall.flatMap(({ year }) =>
        fallYearSchema
          .parse(readJson(fallDataPath(year)))
          .records.map(({ name }) => name),
      ),
    )
    expect(names.size).toBeGreaterThan(10_000)
    expect(stringsIn(file).filter((text) => names.has(text))).toEqual([])
  },
  ALL_RECORDS_TIMEOUT_MS,
)

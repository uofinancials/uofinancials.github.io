import { existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { type FyYear, fyYearSchema } from '../../src/data/fy.ts'
import { manifestSchema } from '../../src/data/manifest.ts'
import { TEMP_POSITION_CLASS } from '../../src/lib/census/totals.ts'
import { fyDataPath, MANIFEST_PATH, readJson } from '../scrape/cache.ts'

// Counted independently from the PDFs' text before the parser was written.
const PINS = [
  [2021, 2_076, 6_311, 404, 249_186_800],
  [2022, 2_599, 7_233, 650, 323_964_600],
  [2023, 2_934, 7_238, 681, 379_935_600],
  [2024, 3_041, 7_346, 777, 547_457_700],
  [2025, 2_929, 7_301, 756, 577_508_500],
  [2026, 2_805, 6_932, 727, 566_438_100],
] as const

function readYear(fiscalYear: number): FyYear {
  return fyYearSchema.parse(readJson(fyDataPath(fiscalYear)))
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'the manifest lists each committed FY year with its record counts',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    expect(manifest.fy.map(({ fiscalYear }) => fiscalYear)).toEqual(
      PINS.map(([fiscalYear]) => fiscalYear),
    )
    for (const entry of manifest.fy) {
      const { records } = readYear(entry.fiscalYear)
      for (const file of entry.files) {
        expect(
          records.filter((record) => record.kind === file.kind).length,
          `${entry.fiscalYear} ${file.kind}`,
        ).toBe(file.records)
      }
    }
  },
)

test.skipIf(!existsSync(MANIFEST_PATH)).each(PINS)(
  'FY%i: %i classified and %i unclassified jobs; %i temporaries paid %i cents',
  (fiscalYear, classified, unclassified, temps, tempPayCents) => {
    const { records } = readYear(fiscalYear)
    const temporaries = records.filter(
      (record) =>
        record.kind === 'classified' &&
        TEMP_POSITION_CLASS.test(record.positionClass.code),
    )
    expect({
      classified: records.filter((record) => record.kind === 'classified')
        .length,
      unclassified: records.filter((record) => record.kind === 'unclassified')
        .length,
      temps: temporaries.length,
      tempPayCents: temporaries.reduce(
        (sum, record) => sum + record.totalPayCents,
        0,
      ),
    }).toEqual({ classified, unclassified, temps, tempPayCents })
  },
)

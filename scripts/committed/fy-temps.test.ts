import { existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { fyYearSchema } from '../../src/data/fy.ts'
import { fyTempsSchema } from '../../src/data/fy-temps.ts'
import { isClassifiedTemp } from '../../src/lib/census/totals.ts'
import { FY_TEMPS_DATA_PATH, fyDataPath, readJson } from '../scrape/cache.ts'

/** Each fiscal year's estimated temporaries' FTE, in hundredths, as `pnpm scrape summary` first derived it. */
const FTE_PINS = new Map([
  [2021, 6_665],
  [2022, 8_453],
  [2023, 8_795],
  [2024, 11_849],
  [2025, 11_882],
  [2026, 11_159],
])

test.skipIf(!existsSync(FY_TEMPS_DATA_PATH))(
  'temporaries’ FY pay by unit adds up to each FY year’s temporaries, with the pinned FTE and the known units without an area',
  () => {
    const { years } = fyTempsSchema.parse(readJson(FY_TEMPS_DATA_PATH))
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
    const figures = years.map(({ fiscalYear, censusYear, units }) => {
      const temps = fyYearSchema
        .parse(readJson(fyDataPath(fiscalYear)))
        .records.filter(isClassifiedTemp)
      return {
        fiscalYear,
        censusYear,
        jobs: sum(units.map(({ jobs }) => jobs)) - temps.length,
        payCents:
          sum(units.map(({ payCents }) => payCents)) -
          sum(temps.map(({ totalPayCents }) => totalPayCents)),
        fteHundredths: sum(units.map(({ fteHundredths }) => fteHundredths)),
        unassigned: units.flatMap(({ code, area }) => (area ? [] : [code])),
      }
    })
    expect(figures).toEqual(
      [...FTE_PINS].map(([fiscalYear, fteHundredths]) => ({
        fiscalYear,
        censusYear: fiscalYear - 1,
        jobs: 0,
        payCents: 0,
        fteHundredths,
        unassigned:
          fiscalYear === 2022 || fiscalYear === 2023
            ? ['632110']
            : fiscalYear === 2024
              ? ['410230']
              : [],
      })),
    )
  },
)

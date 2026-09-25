import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { fallYearSchema } from '../src/data/fall.ts'
import { opeGroupOf } from '../src/lib/ope-groups.ts'
import { trendGroupOf } from '../src/lib/trend-groups.ts'
import { DATA_DIR } from './scrape/cache.ts'

function readFall(year: number) {
  return fallYearSchema.parse(
    JSON.parse(
      readFileSync(path.join(DATA_DIR, 'fall', `${year}.json`), 'utf8'),
    ),
  ).records
}

function opeGroupCounts(year: number): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const record of readFall(year)) {
    const ref = opeGroupOf(record, trendGroupOf(record, year), year)
    const key = ref ? [ref.group, ref.leave].filter(Boolean).join(' ') : 'none'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

test('every job in Fall 2019-2025 maps to an OPE group, and 2019 and 2025 match an independent count', () => {
  for (let year = 2020; year <= 2024; year++) opeGroupCounts(year)
  expect(opeGroupCounts(2019)).toEqual({
    'Faculty/Staff A': 1618,
    Athletics: 261,
    'Faculty/Staff B Exec': 31,
    'Faculty/Staff B Faculty': 1644,
    'Faculty/Staff C': 390,
    'Classified Service': 444,
    'Classified Skilled/Clerical': 611,
    'Classified Technical': 490,
    none: 1349,
  })
  expect(opeGroupCounts(2025)).toEqual({
    'Faculty/Staff A': 1970,
    Athletics: 285,
    'Faculty/Staff B Exec': 34,
    'Faculty/Staff B Faculty': 1489,
    'Faculty/Staff C': 326,
    'Classified Service': 537,
    'Classified Skilled/Clerical': 636,
    'Classified Technical': 572,
    none: 991,
  })
})

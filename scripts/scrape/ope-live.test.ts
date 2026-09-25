import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { hasRatesSources, RATES_SOURCE_DIR } from './cache.ts'
import { combineOpePages } from './ope-pages.ts'

// Values read from the BRP pages during research on 2026-09-24.
const FY27_OPE: Record<string, number> = {
  Athletics: 3750,
  'Faculty/Staff A': 7740,
  'Faculty/Staff B': 5110,
  'Faculty/Staff C': 3400,
  'Classified Service': 10_740,
  'Classified Skilled/Clerical': 9100,
  'Classified Technical': 8020,
  Temps: 3230,
  Student: 330,
}
const HISTORY_A = [8040, 7900, 7820, 7720, 8160, 7490, 7490]
const HISTORY_CLASSIFIED_SERVICE = [
  12_350, 11_930, 12_950, 12_030, 10_650, 10_450, 10_450,
]

async function readCachedPages() {
  const read = (name: string) =>
    readFile(path.join(RATES_SOURCE_DIR, `${name}.html`), 'utf8')
  return combineOpePages({
    current: await read('current'),
    history: await read('history'),
    matrix: await read('matrix'),
  })
}

test.skipIf(!hasRatesSources)(
  'the cached BRP pages parse to the researched rates',
  async () => {
    const rates = await readCachedPages()
    const byYear = (group: string) =>
      rates.opeRates
        .filter((rate) => rate.group === group && rate.source === 'history')
        .map((rate) => rate.basisPoints)
    expect(
      Object.fromEntries(
        rates.opeRates
          .filter((rate) => rate.fiscalYear === 2027)
          .map((rate) => [rate.group, rate.basisPoints]),
      ),
    ).toEqual(FY27_OPE)
    expect(byYear('Faculty/Staff A')).toEqual(HISTORY_A)
    expect(byYear('Classified Service')).toEqual(HISTORY_CLASSIFIED_SERVICE)
    expect(
      rates.leaveRates.find((rate) => rate.appliesTo === 'Exec')?.basisPoints,
    ).toBe(957)
    expect(
      rates.persRepayment
        .filter((rate) => rate.fundType === '11')
        .map((rate) => rate.basisPoints),
    ).toEqual([126, 116, 255])
    expect(
      rates.groups.find((group) => group.name === 'Temps')?.eclassCodes,
    ).toEqual(['TS', 'AV', 'FV'])
  },
)

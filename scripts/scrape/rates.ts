import { writeFile } from 'node:fs/promises'
import type { Manifest } from '../../src/data/manifest.ts'
import { opeRatesSchema } from '../../src/data/ope.ts'
import { OPE_DATA_PATH, ratesSourcePath } from './cache.ts'
import { fetchCached } from './fetch.ts'
import { fetchedFile, type StepResult } from './manifest-file.ts'
import { combineOpePages } from './ope-pages.ts'

const BRP = 'https://brp.uoregon.edu/content'

export async function runRates(manifest: Manifest): Promise<StepResult> {
  const current = await fetchCached(
    `${BRP}/Blended-OPE`,
    ratesSourcePath('current'),
  )
  const history = await fetchCached(
    `${BRP}/Blended-OPE-Rate-History`,
    ratesSourcePath('history'),
  )
  const matrix = await fetchCached(
    `${BRP}/Employee-Rate-Group-Matrix`,
    ratesSourcePath('matrix'),
  )
  const rates = opeRatesSchema.parse(
    combineOpePages({
      current: current.bytes.toString('utf8'),
      history: history.bytes.toString('utf8'),
      matrix: matrix.bytes.toString('utf8'),
    }),
  )
  await writeFile(OPE_DATA_PATH, `${JSON.stringify(rates, null, 2)}\n`)
  console.log(
    `rates: ${rates.groups.length} groups, ${rates.opeRates.length} OPE rates, ${rates.leaveRates.length} leave rates`,
  )
  return {
    manifest: {
      ...manifest,
      rates: {
        pages: [current, history, matrix].map(fetchedFile),
        groups: rates.groups.length,
        opeRates: rates.opeRates.length,
        leaveRates: rates.leaveRates.length,
        persRepayment: rates.persRepayment.length,
      },
    },
    problems: [],
  }
}

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Manifest } from '../../src/data/manifest.ts'
import { opeRatesSchema } from '../../src/data/ope.ts'
import { OPE_DATA_PATH, RATES_SOURCE_DIR } from './cache.ts'
import { type CachedSource, fetchCached } from './fetch.ts'
import { type StepResult, sha256Hex } from './manifest-file.ts'
import { combineOpePages } from './ope-pages.ts'

const BRP = 'https://brp.uoregon.edu/content'
export const OPE_PAGES = {
  current: `${BRP}/Blended-OPE`,
  history: `${BRP}/Blended-OPE-Rate-History`,
  matrix: `${BRP}/Employee-Rate-Group-Matrix`,
} as const

type PageName = keyof typeof OPE_PAGES

async function fetchPage(name: PageName): Promise<CachedSource> {
  return fetchCached(
    OPE_PAGES[name],
    path.join(RATES_SOURCE_DIR, `${name}.html`),
  )
}

export async function runRates(manifest: Manifest): Promise<StepResult> {
  try {
    const current = await fetchPage('current')
    const history = await fetchPage('history')
    const matrix = await fetchPage('matrix')
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
          pages: [current, history, matrix].map((page) => ({
            url: page.url,
            sha256: sha256Hex(page.bytes),
            lastModified: page.lastModified,
            retrievedOn: page.retrievedOn,
          })),
          groups: rates.groups.length,
          opeRates: rates.opeRates.length,
          leaveRates: rates.leaveRates.length,
          persRepayment: rates.persRepayment.length,
        },
      },
      problems: [],
    }
  } catch (error) {
    return { manifest, problems: [String(error)] }
  }
}

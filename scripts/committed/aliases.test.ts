import { existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../../src/data/budget.ts'
import { fallYearSchema } from '../../src/data/fall.ts'
import { manifestSchema } from '../../src/data/manifest.ts'
import {
  DISTINCT_PEOPLE,
  PERSON_ALIASES,
} from '../../src/data/person-aliases.ts'
import { DISTINCT_UNITS, UNIT_ALIASES } from '../../src/data/unit-aliases.ts'
import { findPersonCandidates } from '../aliases/person-candidates.ts'
import { findUnitCandidates } from '../aliases/unit-candidates.ts'
import {
  budgetDataPath,
  fallDataPath,
  MANIFEST_PATH,
  readJson,
} from '../scrape/cache.ts'

/** Parsing every census and budget and searching them takes several seconds. */
const ALL_YEARS_TIMEOUT_MS = 20_000

function unitKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every unit and person candidate in the committed data has been reviewed',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const falls = manifest.fall.map(({ year }) =>
      fallYearSchema.parse(readJson(fallDataPath(year))),
    )
    const budgets = manifest.budget.map(({ fiscalYear }) =>
      budgetYearSchema.parse(readJson(budgetDataPath(fiscalYear))),
    )
    const reviewedUnits = new Set([
      ...UNIT_ALIASES.map(({ code, sameAs }) => unitKey(code, sameAs)),
      ...DISTINCT_UNITS.map(([a, b]) => unitKey(a, b)),
    ])
    const reviewedPeople = new Set(
      [...PERSON_ALIASES, ...DISTINCT_PEOPLE].map(
        ([earlier, later]) => `${earlier}|${later}`,
      ),
    )
    expect(
      findUnitCandidates(falls, budgets).filter(
        ({ codes: [a, b] }) => !reviewedUnits.has(unitKey(a, b)),
      ),
    ).toEqual([])
    expect(
      findPersonCandidates(falls).filter(
        ({ names: [a, b] }) => !reviewedPeople.has(`${a}|${b}`),
      ),
    ).toEqual([])
  },
  ALL_YEARS_TIMEOUT_MS,
)

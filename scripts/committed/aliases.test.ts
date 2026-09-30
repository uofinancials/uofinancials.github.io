import { existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { budgetYearSchema } from '../../src/data/budget.ts'
import { fallYearSchema } from '../../src/data/fall.ts'
import { manifestSchema } from '../../src/data/manifest.ts'
import {
  DISTINCT_PEOPLE,
  PERSON_ALIASES,
} from '../../src/data/person-aliases.ts'
import {
  DISTINCT_UNITS,
  foldUnitAliases,
  UNIT_ALIASES,
} from '../../src/data/unit-aliases.ts'
import {
  findNamePairs,
  isLinkedByRule,
  namePairKey,
} from '../../src/lib/people/name-pairs.ts'
import { findUnitCandidates, unitPair } from '../aliases/unit-candidates.ts'
import {
  budgetDataPath,
  fallDataPath,
  MANIFEST_PATH,
  readJson,
} from '../scrape/cache.ts'

/** Parsing every census and budget and searching them takes several seconds. */
const ALL_YEARS_TIMEOUT_MS = 20_000

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every unit candidate in the committed data, and every name pair no rule links in it as the site reads it, has been reviewed',
  () => {
    const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
    const falls = manifest.fall.map(({ year }) =>
      fallYearSchema.parse(readJson(fallDataPath(year))),
    )
    const budgets = manifest.budget.map(({ fiscalYear }) =>
      budgetYearSchema.parse(readJson(budgetDataPath(fiscalYear))),
    )
    const reviewedUnits = new Set([
      ...UNIT_ALIASES.map(({ code, sameAs }) =>
        unitPair(code, sameAs).join('|'),
      ),
      ...DISTINCT_UNITS.map(([a, b]) => unitPair(a, b).join('|')),
    ])
    const reviewedPeople = new Set(
      [...PERSON_ALIASES, ...DISTINCT_PEOPLE].map(namePairKey),
    )
    expect(
      findUnitCandidates(falls, budgets).filter(
        ({ codes }) => !reviewedUnits.has(codes.join('|')),
      ),
    ).toEqual([])
    expect(
      findNamePairs(falls.map(foldUnitAliases)).filter(
        (pair) =>
          !isLinkedByRule(pair) && !reviewedPeople.has(namePairKey(pair.names)),
      ),
    ).toEqual([])
  },
  ALL_YEARS_TIMEOUT_MS,
)

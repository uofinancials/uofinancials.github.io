import { existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { type BudgetYear, budgetYearSchema } from '../../src/data/budget.ts'
import { type FallYear, fallYearSchema } from '../../src/data/fall.ts'
import { manifestSchema } from '../../src/data/manifest.ts'
import { PAY_CODES_WITHOUT_UNIT } from '../../src/data/pay-code-units.ts'
import {
  DISTINCT_PEOPLE,
  PERSON_ALIASES,
} from '../../src/data/person-aliases.ts'
import {
  DISTINCT_UNITS,
  foldBudgetAliases,
  foldUnitAliases,
  unitCodeOf,
} from '../../src/data/unit-aliases.ts'
import {
  findNamePairs,
  isLinkedByRule,
  namePairKey,
} from '../../src/lib/people/name-pairs.ts'
import {
  findPayCodeCandidates,
  unpublishedPayCodes,
} from '../aliases/pay-code-candidates.ts'
import { findUnitCandidates, unitPair } from '../aliases/unit-candidates.ts'
import {
  budgetDataPath,
  fallDataPath,
  MANIFEST_PATH,
  readJson,
} from '../scrape/cache.ts'

/** Parsing every census and budget and searching them takes several seconds. */
const ALL_YEARS_TIMEOUT_MS = 20_000

let committed: { falls: FallYear[]; budgets: BudgetYear[] } | undefined

function committedData() {
  if (committed) return committed
  const manifest = manifestSchema.parse(readJson(MANIFEST_PATH))
  committed = {
    falls: manifest.fall.map(({ year }) =>
      fallYearSchema.parse(readJson(fallDataPath(year))),
    ),
    budgets: manifest.budget.map(({ fiscalYear }) =>
      budgetYearSchema.parse(readJson(budgetDataPath(fiscalYear))),
    ),
  }
  return committed
}

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every unit candidate in the committed data, and every name pair no rule links in it as the site reads it, has been reviewed',
  () => {
    const { falls, budgets } = committedData()
    const distinctUnits = new Set(
      DISTINCT_UNITS.map(([a, b]) => unitPair(a, b).join('|')),
    )
    const reviewedPeople = new Set(
      [...PERSON_ALIASES, ...DISTINCT_PEOPLE].map(namePairKey),
    )
    expect(
      findUnitCandidates(falls, budgets).filter(
        ({ codes: [a, b] }) =>
          unitCodeOf(a) !== unitCodeOf(b) && !distinctUnits.has(`${a}|${b}`),
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

test.skipIf(!existsSync(MANIFEST_PATH))(
  'every census pay code no budget publishes is joined to a unit or reviewed as having none, as the site reads it',
  () => {
    const committed = committedData()
    const falls = committed.falls.map(foldUnitAliases)
    const budgets = committed.budgets.map(foldBudgetAliases)
    const reviewed = new Set(PAY_CODES_WITHOUT_UNIT)
    const unreviewed = [...unpublishedPayCodes(falls, budgets).keys()].filter(
      (code) => !reviewed.has(code),
    )
    const candidates =
      unreviewed.length > 0 ? findPayCodeCandidates(falls, budgets) : []
    expect(
      unreviewed.map((code) => ({
        code,
        candidates: candidates
          .filter(({ payCode }) => payCode === code)
          .map(({ unit, reason }) => ({ unit, reason })),
      })),
    ).toEqual([])
  },
  ALL_YEARS_TIMEOUT_MS,
)

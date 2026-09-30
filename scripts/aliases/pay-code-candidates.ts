import type { BudgetYear } from '../../src/data/budget.ts'
import type { FallYear } from '../../src/data/fall.ts'
import { ORG_LEVEL_AREA } from '../../src/lib/census/areas.ts'
import { normalizeUnitName } from './unit-candidates.ts'

type PayCodeReason = 'neighbour' | 'same-name' | 'name-prefix'

/** A census pay code no budget publishes, and a budget unit whose staff it may pay. */
export type PayCodeCandidate = {
  payCode: string
  unit: string
  reason: PayCodeReason
}

/** Fewest words a unit's normalised name needs before a pay code's name that starts with it marks them as candidates. */
const MIN_PREFIX_WORDS = 2

const CODE_WIDTH = 6

function addName(byCode: Map<string, Set<string>>, code: string, name: string) {
  byCode.set(code, (byCode.get(code) ?? new Set()).add(normalizeUnitName(name)))
}

function unitNamesByCode(budgets: BudgetYear[]): Map<string, Set<string>> {
  const names = new Map<string, Set<string>>()
  for (const { orgs } of budgets) {
    for (const [code, org] of Object.entries(orgs)) {
      if (org.level !== ORG_LEVEL_AREA) addName(names, code, org.name)
    }
  }
  return names
}

function unpublishedPayCodes(
  falls: FallYear[],
  budgets: BudgetYear[],
): Map<string, Set<string>> {
  const published = new Set(budgets.flatMap(({ orgs }) => Object.keys(orgs)))
  const names = new Map<string, Set<string>>()
  for (const { records } of falls) {
    for (const { payDepartment } of records) {
      const { code, name } = payDepartment
      if (code !== null && !published.has(code)) addName(names, code, name)
    }
  }
  return names
}

function isNeighbour(payCode: string, unit: string): boolean {
  return (
    /^\d+$/.test(payCode) &&
    [-1, 1].some(
      (step) =>
        String(Number(payCode) + step).padStart(CODE_WIDTH, '0') === unit,
    )
  )
}

function nameReason(
  payNames: Set<string>,
  unitNames: Set<string>,
): PayCodeReason | null {
  const pays = [...payNames]
  if (pays.some((name) => unitNames.has(name))) return 'same-name'
  const isPrefixed = [...unitNames].some(
    (unit) =>
      unit.split(' ').length >= MIN_PREFIX_WORDS &&
      pays.some((name) => name.startsWith(`${unit} `)),
  )
  return isPrefixed ? 'name-prefix' : null
}

/** Every pay code no budget publishes paired with each budget unit one code above or below it, or whose normalised name it shares or begins with. */
export function findPayCodeCandidates(
  falls: FallYear[],
  budgets: BudgetYear[],
): PayCodeCandidate[] {
  const units = unitNamesByCode(budgets)
  const candidates: PayCodeCandidate[] = []
  for (const [payCode, payNames] of unpublishedPayCodes(falls, budgets)) {
    for (const [unit, unitNames] of units) {
      const reason = isNeighbour(payCode, unit)
        ? 'neighbour'
        : nameReason(payNames, unitNames)
      if (reason) candidates.push({ payCode, unit, reason })
    }
  }
  return candidates.sort(
    (a, b) =>
      a.payCode.localeCompare(b.payCode) || a.unit.localeCompare(b.unit),
  )
}

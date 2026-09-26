import type { BudgetYear } from '../data/budget.ts'
import type { FallRecord } from '../data/fall.ts'
import { describePlace } from './census-search.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import { formatDollars } from './format.ts'
import {
  formatPosition,
  positionLabel,
  positionOf,
} from './salary-distribution.ts'
import type {
  EliminationResult,
  Rule,
  RuleResult,
  ScenarioResult,
  ScenarioScope,
} from './scenario.ts'
import { BASIS } from './scenario-jobs.ts'
import { toPercent } from './scenario-search.ts'

/** The job counts a census rule carries `smallReachNote` at. */
const SMALL_REACH = new Map([
  [1, 'one job'],
  [2, 'two jobs'],
])

function placeLabel(
  dept: string,
  census: DepartmentCensus,
  budget: BudgetYear,
): string {
  const place = describePlace(dept, census, budget)
  return place.scope === 'area' || place.scope === 'department'
    ? `in ${place.name} (${place.code})`
    : `in code ${dept}, which has no jobs in Fall ${census.year}`
}

/** The jobs a scope reaches, e.g. "Executives, 12-month, in College of Arts and Sciences (222000)". */
export function describeScope(
  scope: ScenarioScope,
  census: DepartmentCensus,
  budget: BudgetYear,
): string {
  const parts = [
    scope.group,
    scope.kind === 'all' ? null : scope.kind,
    scope.term === null ? null : `${scope.term}-month`,
    scope.position === null
      ? null
      : positionLabel(census.records, scope.position),
    scope.dept === null ? null : placeLabel(scope.dept, census, budget),
  ].filter((part) => part !== null)
  return parts.length > 0 ? parts.join(', ') : 'All jobs'
}

/** What a rule does, e.g. "10% off pay above $200,000". */
export function describeRule(rule: Rule): string {
  switch (rule.kind) {
    case 'threshold':
      return rule.cutBasisPoints === BASIS
        ? `Pay capped at ${formatDollars(rule.overCents)}`
        : `${toPercent(rule.cutBasisPoints)}% off pay above ${formatDollars(rule.overCents)}`
    case 'remove':
      return 'Jobs removed'
    case 'cut':
      return `${toPercent(rule.cutBasisPoints)}% off pay`
    case 'freeze':
      return `A ${rule.years}-year hiring freeze, then positions ${rule.afterFreeze === 'refill' ? 'refilled' : 'eliminated'}`
    case 'eliminate':
      return 'Eliminated'
    case 'raises': {
      const years = `${rule.years} ${rule.years === 1 ? 'year' : 'years'}`
      return rule.capBasisPoints === 0
        ? `Raises frozen for ${years}`
        : `Raises capped at ${toPercent(rule.capBasisPoints)}% for ${years}`
    }
  }
}

/** The note a census rule carries when it reaches one or two jobs; `null` otherwise. */
export function smallReachNote(jobs: number): string | null {
  const reach = SMALL_REACH.get(jobs)
  if (reach === undefined) return null
  return `This rule reaches ${reach}. A scenario is an estimate over job classes, groups, and thresholds, not a recommendation about anyone.`
}

/** Each class and rank in the census, keyed as a scope holds it, with its label, in label order. */
export function positionOptions(records: FallRecord[]): Map<string, string> {
  const labels = new Map<string, string>()
  for (const record of records) {
    const key = positionOf(record)
    if (key === null || labels.has(key)) continue
    const title =
      record.kind === 'classified' ? record.positionClass?.title : null
    labels.set(key, formatPosition(key, title))
  }
  return new Map([...labels].sort((a, b) => a[1].localeCompare(b[1])))
}

/** One row of the savings table: a rule as it reads, and what it did. */
export type ResultRow = {
  key: string
  /** The rule's place in the whole stack, from 1. */
  position: number
  label: string
  scope: string
  result: Exclude<RuleResult, EliminationResult>
}

/** Each rule but eliminations beside its result, in stack order. */
export function scenarioResultRows(
  rules: Rule[],
  result: ScenarioResult,
  census: DepartmentCensus,
  budget: BudgetYear,
): ResultRow[] {
  return rules.flatMap((rule, index) => {
    const ruleResult = result.rules[index]
    return ruleResult &&
      rule.kind !== 'eliminate' &&
      ruleResult.kind !== 'eliminate'
      ? [
          {
            key: `${index} ${rule.kind}`,
            position: index + 1,
            label: describeRule(rule),
            scope: describeScope(rule.scope, census, budget),
            result: ruleResult,
          },
        ]
      : []
  })
}

/** Each elimination's result with its place in the whole stack, from 1. */
export function eliminationRows(
  result: ScenarioResult,
): { position: number; result: EliminationResult }[] {
  return result.rules.flatMap((rule, index) =>
    rule.kind === 'eliminate' ? [{ position: index + 1, result: rule }] : [],
  )
}

/** A year's E&G savings before freezes: the census rules' total and the eliminations. */
export function totalEgCents(result: ScenarioResult): number {
  return result.total.egCents + (result.eliminated?.egCents ?? 0)
}

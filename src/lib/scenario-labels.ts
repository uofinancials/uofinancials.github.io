import type { BudgetYear } from '../data/budget.ts'
import { describePlace } from './census-search.ts'
import type { DepartmentCensus } from './department-jobs.ts'
import { formatDollars } from './format.ts'
import { positionLabel } from './salary-distribution.ts'
import type { Rule, ScenarioScope } from './scenario.ts'
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
  }
}

/** The note a census rule carries when it reaches one or two jobs; `null` otherwise. */
export function smallReachNote(jobs: number): string | null {
  const reach = SMALL_REACH.get(jobs)
  if (reach === undefined) return null
  return `This rule reaches ${reach}. A scenario is an estimate over job classes, groups, and thresholds, not a recommendation about anyone.`
}

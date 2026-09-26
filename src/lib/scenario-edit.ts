import {
  ANY_SCOPE,
  type Rule,
  type RuleStage,
  stageOf,
  stageRank,
} from './scenario.ts'

export const RULE_KINDS = [
  'threshold',
  'remove',
  'cut',
  'freeze',
  'raises',
  'eliminate',
] as const
export type RuleKind = (typeof RULE_KINDS)[number]

export const RULE_KIND_LABELS: Record<RuleKind, string> = {
  threshold: 'Cut pay above a threshold',
  remove: 'Remove jobs',
  cut: 'Cut pay',
  freeze: 'Hiring freeze',
  raises: 'Freeze raises',
  eliminate: 'Eliminate a department or area',
}

/** A new rule of a kind, over all jobs, with starting amounts; an elimination starts at `firstCode`. */
export function newRule(kind: RuleKind, firstCode: string): Rule {
  switch (kind) {
    case 'threshold':
      return {
        kind,
        scope: ANY_SCOPE,
        overCents: 20_000_000,
        cutBasisPoints: 1_000,
      }
    case 'remove':
      return { kind, scope: ANY_SCOPE }
    case 'cut':
      return { kind, scope: ANY_SCOPE, cutBasisPoints: 500 }
    case 'freeze':
      return { kind, scope: ANY_SCOPE, years: 1, afterFreeze: 'refill' }
    case 'raises':
      return { kind, scope: ANY_SCOPE, years: 1, capBasisPoints: 0 }
    case 'eliminate':
      return { kind, code: firstCode }
  }
}

export const RULE_STAGE_HEADINGS: Record<RuleStage, string> = {
  eliminate: 'Removed first',
  census: 'Pay rules, in order',
  freeze: 'Hiring freezes, after the rules above',
  raises: 'Raise freezes, last',
}

/** Whether the rule at `index` can swap with its neighbour at `offset`: both exist and share a stage. */
export function canMoveRule(
  rules: Rule[],
  index: number,
  offset: -1 | 1,
): boolean {
  const moving = rules[index]
  const other = rules[index + offset]
  return (
    moving !== undefined &&
    other !== undefined &&
    stageOf(moving) === stageOf(other)
  )
}

export function swapAt<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const moving = items[index]
  const other = items[index + offset]
  if (moving === undefined || other === undefined) return items
  return items.with(index, other).with(index + offset, moving)
}

/** Where a new rule goes in stage-ordered rules: the end of its stage. */
export function ruleInsertIndex(rules: Rule[], rule: Rule): number {
  return rules.filter((listed) => stageRank(listed) <= stageRank(rule)).length
}

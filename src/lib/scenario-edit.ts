import { ANY_SCOPE, type Rule } from './scenario.ts'

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

/** The stages a scenario runs its rules in, whatever their order in the stack. */
export const RULE_STAGES = ['eliminate', 'census', 'freeze', 'raises'] as const
export type RuleStage = (typeof RULE_STAGES)[number]

export const RULE_STAGE_HEADINGS: Record<RuleStage, string> = {
  eliminate: 'Removed first',
  census: 'Pay rules, in order',
  freeze: 'Hiring freezes, after the rules above',
  raises: 'Raise freezes, last',
}

export function stageOf(rule: Rule): RuleStage {
  switch (rule.kind) {
    case 'threshold':
    case 'remove':
    case 'cut':
      return 'census'
    default:
      return rule.kind
  }
}

/** The rules in stage order, keeping their order within each stage. */
export function sortByStage(rules: Rule[]): Rule[] {
  return rules.toSorted(
    (a, b) => RULE_STAGES.indexOf(stageOf(a)) - RULE_STAGES.indexOf(stageOf(b)),
  )
}

/** The rules with the one at `index` swapped with its neighbour; unchanged at either end of its stage. */
export function moveRule(rules: Rule[], index: number, offset: -1 | 1): Rule[] {
  const target = index + offset
  const moving = rules[index]
  const other = rules[target]
  if (moving === undefined || other === undefined) return rules
  if (stageOf(moving) !== stageOf(other)) return rules
  const moved = [...rules]
  moved[index] = other
  moved[target] = moving
  return moved
}

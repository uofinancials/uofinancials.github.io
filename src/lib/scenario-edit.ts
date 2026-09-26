import { ANY_SCOPE, type Rule } from './scenario.ts'

export const RULE_KINDS = [
  'threshold',
  'remove',
  'cut',
  'freeze',
  'eliminate',
] as const
export type RuleKind = (typeof RULE_KINDS)[number]

export const RULE_KIND_LABELS: Record<RuleKind, string> = {
  threshold: 'Cut pay above a threshold',
  remove: 'Remove jobs',
  cut: 'Cut pay',
  freeze: 'Hiring freeze',
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
    case 'eliminate':
      return { kind, code: firstCode }
  }
}

/** The rules with the one at `index` swapped with its neighbour; unchanged at either end. */
export function moveRule(rules: Rule[], index: number, offset: -1 | 1): Rule[] {
  const target = index + offset
  const moving = rules[index]
  const other = rules[target]
  if (moving === undefined || other === undefined) return rules
  const moved = [...rules]
  moved[index] = other
  moved[target] = moving
  return moved
}

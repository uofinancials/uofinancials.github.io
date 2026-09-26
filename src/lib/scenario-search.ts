import { z } from 'zod'
import { orgCodeParam } from '../data/budget.ts'
import { staffKindSchema } from '../data/fall.ts'
import { CENTS_PER_DOLLAR } from './format.ts'
import { TERMS } from './salary-distribution.ts'
import type { Rule, ScenarioScope } from './scenario.ts'
import { TREND_GROUPS } from './trend-groups.ts'

const BASIS_POINTS_PER_PERCENT = 100
const MAX_FREEZE_YEARS = 5

/** A scope as the URL holds it: each field is optional and means "any" when absent, but a malformed one makes the rule unreadable. */
const scopeEntry = z
  .strictObject({
    group: z.enum(TREND_GROUPS),
    kind: staffKindSchema,
    term: z.literal(TERMS),
    dept: orgCodeParam,
    position: z.string().min(1),
  })
  .partial()

/** A percent with at most two decimals, as whole basis points. */
const percentEntry = z
  .number()
  .gt(0)
  .max(100)
  .transform((percent) => percent * BASIS_POINTS_PER_PERCENT)
  .refine(
    (basisPoints) => Math.abs(basisPoints - Math.round(basisPoints)) < 1e-9,
  )
  .transform(Math.round)

const dollarsEntry = z.number().int().nonnegative()
const yearsEntry = z.number().int().min(1).max(MAX_FREEZE_YEARS)

/** A typed number, or `null` for blank text, before it is checked. */
function typedNumber(text: string): number | null {
  return text.trim() === '' ? null : Number(text)
}

/** Whole dollars typed into a field, as cents; `null` when they are not a valid threshold. */
export function parseDollarsText(text: string): number | null {
  const parsed = dollarsEntry.safeParse(typedNumber(text))
  return parsed.success ? parsed.data * CENTS_PER_DOLLAR : null
}

/** A percent typed into a field, as basis points; `null` when it is not a valid cut. */
export function parsePercentText(text: string): number | null {
  const parsed = percentEntry.safeParse(typedNumber(text))
  return parsed.success ? parsed.data : null
}

/** Freeze years typed into a field; `null` when they are not 1 to 5. */
export function parseYearsText(text: string): number | null {
  const parsed = yearsEntry.safeParse(typedNumber(text))
  return parsed.success ? parsed.data : null
}

const ruleEntry = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('threshold'),
    scope: scopeEntry.default({}),
    overDollars: dollarsEntry,
    cutPercent: percentEntry,
  }),
  z.strictObject({ kind: z.literal('remove'), scope: scopeEntry.default({}) }),
  z.strictObject({
    kind: z.literal('cut'),
    scope: scopeEntry.default({}),
    cutPercent: percentEntry,
  }),
  z.strictObject({
    kind: z.literal('freeze'),
    scope: scopeEntry.default({}),
    years: yearsEntry,
    afterFreeze: z.enum(['refill', 'eliminate']),
  }),
])

type ScopeEntry = z.input<typeof scopeEntry>

/** A scenario as URL search params: `case` indexes the baselines, and `rules` is read by `parseRules`. */
export const scenarioSearchSchema = z.object({
  case: z.number().int().nonnegative().optional().catch(undefined),
  rules: z.array(z.unknown()).optional().catch(undefined),
})

/** The baseline a search's `case` names, or the first when it names none. */
export function resolveBaselineIndex(
  index: number | undefined,
  baselineCount: number,
): number {
  return index !== undefined && index < baselineCount ? index : 0
}

function toScope(entry: z.output<typeof scopeEntry>): ScenarioScope {
  return {
    group: entry.group ?? null,
    kind: entry.kind ?? 'all',
    term: entry.term ?? null,
    dept: entry.dept ?? null,
    position: entry.position ?? null,
  }
}

function toRule(entry: z.output<typeof ruleEntry>): Rule {
  const scope = toScope(entry.scope)
  switch (entry.kind) {
    case 'threshold':
      return {
        kind: 'threshold',
        scope,
        overCents: entry.overDollars * CENTS_PER_DOLLAR,
        cutBasisPoints: entry.cutPercent,
      }
    case 'remove':
      return { kind: 'remove', scope }
    case 'cut':
      return { kind: 'cut', scope, cutBasisPoints: entry.cutPercent }
    case 'freeze':
      return { ...entry, scope }
  }
}

/** The rules a search's `rules` array holds, and how many entries were not rules. */
export function parseRules(entries: unknown[]): {
  rules: Rule[]
  dropped: number
} {
  const rules = entries.flatMap((entry) => {
    const parsed = ruleEntry.safeParse(entry)
    return parsed.success ? [toRule(parsed.data)] : []
  })
  return { rules, dropped: entries.length - rules.length }
}

function toScopeEntry(scope: ScenarioScope): ScopeEntry {
  return {
    ...(scope.group !== null && { group: scope.group }),
    ...(scope.kind !== 'all' && { kind: scope.kind }),
    ...(scope.term !== null && { term: scope.term }),
    ...(scope.dept !== null && { dept: scope.dept }),
    ...(scope.position !== null && { position: scope.position }),
  }
}

/** Basis points as a percent, e.g. `1250` as `12.5`. */
export const toPercent = (basisPoints: number) =>
  basisPoints / BASIS_POINTS_PER_PERCENT

function toSearchRule(rule: Rule): z.input<typeof ruleEntry> {
  const scope = toScopeEntry(rule.scope)
  switch (rule.kind) {
    case 'threshold':
      return {
        kind: 'threshold',
        scope,
        overDollars: Math.round(rule.overCents / CENTS_PER_DOLLAR),
        cutPercent: toPercent(rule.cutBasisPoints),
      }
    case 'remove':
      return { kind: 'remove', scope }
    case 'cut':
      return { kind: 'cut', scope, cutPercent: toPercent(rule.cutBasisPoints) }
    case 'freeze':
      return { ...rule, scope }
  }
}

/** The URL form of `rules`, in whole dollars and percents. */
export function toSearchRules(rules: Rule[]): z.input<typeof ruleEntry>[] {
  return rules.map(toSearchRule)
}

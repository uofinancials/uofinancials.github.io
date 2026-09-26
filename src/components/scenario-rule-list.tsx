import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ScenarioRuleEditor } from '@/components/scenario-rule-editor'
import type { BudgetYear } from '@/data/budget'
import { departmentIndex } from '@/lib/department-index'
import type { DepartmentCensus } from '@/lib/department-jobs'
import type { Rule } from '@/lib/scenario'
import {
  canMoveRule,
  newRule,
  RULE_KIND_LABELS,
  RULE_KINDS,
  RULE_STAGE_HEADINGS,
  RULE_STAGES,
  ruleInsertIndex,
  stageOf,
  swapAt,
} from '@/lib/scenario-edit'
import { eliminationOptions } from '@/lib/scenario-eliminate'
import { positionOptions } from '@/lib/scenario-labels'

function fitIds(ids: string[], count: number): string[] {
  return Array.from(
    { length: count },
    (_, at) => ids[at] ?? crypto.randomUUID(),
  )
}

/** One id per rule, kept through the list's own edits and cut or padded to `count` when the rules change from outside it. */
function useRuleIds(count: number) {
  const [storedIds, setIds] = useState(() => fitIds([], count))
  const ids = storedIds.length === count ? storedIds : fitIds(storedIds, count)
  if (ids !== storedIds) setIds(ids)
  return [ids, setIds] as const
}

function AddRuleButtons({
  firstCode,
  onAdd,
}: {
  firstCode: string
  onAdd: (rule: Rule) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {RULE_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm"
          onClick={() => onAdd(newRule(kind, firstCode))}
        >
          <Plus aria-hidden className="size-4" /> {RULE_KIND_LABELS[kind]}
        </button>
      ))}
    </div>
  )
}

/** The rules, each editable in place and grouped by the stage it runs in, with a button to add each kind. */
export function ScenarioRuleList({
  rules,
  census,
  eliminationBudget,
  onChange,
}: {
  rules: Rule[]
  census: DepartmentCensus
  eliminationBudget: BudgetYear
  onChange: (rules: Rule[]) => void
}) {
  const areas = useMemo(() => departmentIndex(census), [census])
  const positions = useMemo(() => positionOptions(census.records), [census])
  const eliminations = useMemo(
    () => eliminationOptions(eliminationBudget),
    [eliminationBudget],
  )
  const [ids, setIds] = useRuleIds(rules.length)
  const handleChange = (changedRules: Rule[], changedIds: string[]) => {
    setIds(changedIds)
    onChange(changedRules)
  }
  const handleAdd = (rule: Rule) => {
    const at = ruleInsertIndex(rules, rule)
    handleChange(
      rules.toSpliced(at, 0, rule),
      ids.toSpliced(at, 0, crypto.randomUUID()),
    )
  }
  const firstCode = eliminations[0]?.code ?? ''
  return (
    <div className="space-y-4">
      {RULE_STAGES.map((stage) => {
        const staged = rules.flatMap((rule, index) =>
          stageOf(rule) === stage ? [{ rule, index }] : [],
        )
        if (staged.length === 0) return null
        return (
          <div key={stage} className="space-y-4">
            <h3 className="font-medium">{RULE_STAGE_HEADINGS[stage]}</h3>
            {staged.map(({ rule, index }) => (
              <ScenarioRuleEditor
                key={ids[index]}
                rule={rule}
                position={index + 1}
                canMoveUp={canMoveRule(rules, index, -1)}
                canMoveDown={canMoveRule(rules, index, 1)}
                areas={areas}
                positions={positions}
                eliminations={eliminations}
                onChange={(changed) => onChange(rules.with(index, changed))}
                onMove={(offset) =>
                  handleChange(
                    swapAt(rules, index, offset),
                    swapAt(ids, index, offset),
                  )
                }
                onRemove={() =>
                  handleChange(
                    rules.toSpliced(index, 1),
                    ids.toSpliced(index, 1),
                  )
                }
              />
            ))}
          </div>
        )
      })}
      <AddRuleButtons firstCode={firstCode} onAdd={handleAdd} />
    </div>
  )
}

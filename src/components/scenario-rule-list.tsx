import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { ScenarioRuleEditor } from '@/components/scenario-rule-editor'
import type { BudgetYear } from '@/data/budget'
import { departmentIndex } from '@/lib/department-index'
import type { DepartmentCensus } from '@/lib/department-jobs'
import type { Rule } from '@/lib/scenario'
import {
  moveRule,
  newRule,
  RULE_KIND_LABELS,
  RULE_KINDS,
} from '@/lib/scenario-edit'
import { eliminationOptions } from '@/lib/scenario-eliminate'
import { positionOptions } from '@/lib/scenario-labels'

/** The stack of rules, each editable in place, with a button to add each kind. */
export function ScenarioRuleList({
  rules,
  census,
  budget,
  eliminationBudget,
  onChange,
}: {
  rules: Rule[]
  census: DepartmentCensus
  budget: BudgetYear
  eliminationBudget: BudgetYear
  onChange: (rules: Rule[]) => void
}) {
  const areas = useMemo(() => departmentIndex(census, budget), [census, budget])
  const positions = useMemo(() => positionOptions(census.records), [census])
  const eliminations = useMemo(
    () => eliminationOptions(eliminationBudget),
    [eliminationBudget],
  )
  const firstCode = eliminations[0]?.code ?? ''
  return (
    <div className="space-y-4">
      {rules.map((rule, index) => (
        <ScenarioRuleEditor
          // biome-ignore lint/suspicious/noArrayIndexKey: rules carry no id, and each editor is controlled by its rule, holding a draft only while a field has focus
          key={index}
          rule={rule}
          position={index + 1}
          count={rules.length}
          areas={areas}
          positions={positions}
          eliminations={eliminations}
          onChange={(changed) =>
            onChange(
              rules.map((listed, at) => (at === index ? changed : listed)),
            )
          }
          onMove={(offset) => onChange(moveRule(rules, index, offset))}
          onRemove={() => onChange(rules.filter((_, at) => at !== index))}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        {RULE_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm"
            onClick={() => onChange([...rules, newRule(kind, firstCode)])}
          >
            <Plus aria-hidden className="size-4" /> {RULE_KIND_LABELS[kind]}
          </button>
        ))}
      </div>
    </div>
  )
}

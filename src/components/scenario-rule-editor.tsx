import { ArrowDown, ArrowUp, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { DraftInput } from '@/components/draft-input'
import { ScenarioScopeFields } from '@/components/scenario-scope-fields'
import { SelectField } from '@/components/select-field'
import type { IndexArea } from '@/lib/department-index'
import { CENTS_PER_DOLLAR } from '@/lib/format'
import type { Rule } from '@/lib/scenario'
import { describeRule } from '@/lib/scenario-labels'
import {
  parseDollarsText,
  parsePercentText,
  parseYearsText,
  toPercent,
} from '@/lib/scenario-search'

const AFTER_FREEZE_OPTIONS: [string, string][] = [
  ['refill', 'Refilled'],
  ['eliminate', 'Eliminated'],
]
const BUTTON_CLASS =
  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm disabled:opacity-50'

function PercentField({
  basisPoints,
  onValue,
}: {
  basisPoints: number
  onValue: (basisPoints: number) => void
}) {
  return (
    <DraftInput
      label="Cut (%)"
      inputMode="decimal"
      value={String(toPercent(basisPoints))}
      parse={parsePercentText}
      onValue={onValue}
    />
  )
}

function AmountFields({
  rule,
  onChange,
}: {
  rule: Rule
  onChange: (rule: Rule) => void
}) {
  switch (rule.kind) {
    case 'threshold':
      return (
        <>
          <DraftInput
            label="Pay above ($)"
            inputMode="numeric"
            value={String(rule.overCents / CENTS_PER_DOLLAR)}
            parse={parseDollarsText}
            onValue={(overCents) => onChange({ ...rule, overCents })}
          />
          <PercentField
            basisPoints={rule.cutBasisPoints}
            onValue={(cutBasisPoints) => onChange({ ...rule, cutBasisPoints })}
          />
        </>
      )
    case 'cut':
      return (
        <PercentField
          basisPoints={rule.cutBasisPoints}
          onValue={(cutBasisPoints) => onChange({ ...rule, cutBasisPoints })}
        />
      )
    case 'remove':
      return null
    case 'freeze':
      return (
        <>
          <DraftInput
            label="Years"
            inputMode="numeric"
            value={String(rule.years)}
            parse={parseYearsText}
            onValue={(years) => onChange({ ...rule, years })}
          />
          <SelectField
            label="Then positions are"
            value={rule.afterFreeze}
            options={AFTER_FREEZE_OPTIONS}
            onSelect={(value) =>
              onChange({
                ...rule,
                afterFreeze: value === 'eliminate' ? 'eliminate' : 'refill',
              })
            }
          />
        </>
      )
  }
}

function RuleButton({
  label,
  isDisabled = false,
  onClick,
  children,
}: {
  label: string
  isDisabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={BUTTON_CLASS}
      aria-label={label}
      disabled={isDisabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** One rule's amounts and scope, with buttons to move it in the stack or remove it. */
export function ScenarioRuleEditor({
  rule,
  position,
  count,
  areas,
  positions,
  onChange,
  onMove,
  onRemove,
}: {
  rule: Rule
  position: number
  count: number
  areas: IndexArea[]
  positions: Map<string, string>
  onChange: (rule: Rule) => void
  onMove: (offset: -1 | 1) => void
  onRemove: () => void
}) {
  const name = `rule ${position}`
  return (
    <fieldset className="min-w-0 space-y-3 rounded-md border p-4">
      <legend className="px-1 font-medium">
        {position}. {describeRule(rule)}
      </legend>
      <div className="flex flex-wrap gap-4">
        <AmountFields rule={rule} onChange={onChange} />
      </div>
      {rule.kind !== 'eliminate' && (
        <ScenarioScopeFields
          scope={rule.scope}
          areas={areas}
          positions={positions}
          onChange={(scope) => onChange({ ...rule, scope })}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <RuleButton
          label={`Move ${name} up`}
          isDisabled={position === 1}
          onClick={() => onMove(-1)}
        >
          <ArrowUp aria-hidden className="size-4" /> Up
        </RuleButton>
        <RuleButton
          label={`Move ${name} down`}
          isDisabled={position === count}
          onClick={() => onMove(1)}
        >
          <ArrowDown aria-hidden className="size-4" /> Down
        </RuleButton>
        <RuleButton label={`Remove ${name}`} onClick={onRemove}>
          <X aria-hidden className="size-4" /> Remove
        </RuleButton>
      </div>
    </fieldset>
  )
}

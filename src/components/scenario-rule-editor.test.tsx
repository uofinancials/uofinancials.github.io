import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { ANY_SCOPE, type Rule } from '@/lib/scenario'
import { ScenarioRuleEditor } from './scenario-rule-editor'

const RULE: Rule = {
  kind: 'threshold',
  scope: ANY_SCOPE,
  overCents: 20_000_000,
  cutBasisPoints: 1_000,
}

const ELIMINATIONS = [
  {
    code: '222000',
    name: 'Arts & Sciences, College of',
    units: [{ code: '223501', name: 'CAS Mathematics' }],
  },
]

function renderEditor(rule: Rule = RULE) {
  const onChange = vi.fn()
  const onMove = vi.fn()
  render(
    <ScenarioRuleEditor
      rule={rule}
      position={1}
      count={2}
      areas={[]}
      positions={new Map([['E0104', 'Office Specialist 2 (E0104)']])}
      eliminations={ELIMINATIONS}
      onChange={onChange}
      onMove={onMove}
      onRemove={vi.fn()}
    />,
  )
  return { onChange, onMove }
}

test('a valid amount is passed up as it is typed, and an invalid one is marked and kept', async () => {
  const { onChange } = renderEditor()
  const over = screen.getByRole('textbox', { name: 'Pay above ($)' })
  await userEvent.clear(over)
  await userEvent.type(over, '25')
  expect(onChange).toHaveBeenLastCalledWith({ ...RULE, overCents: 2_500 })
  await userEvent.type(over, '.5')
  expect(over).toHaveValue('25.5')
  expect(over).toHaveAttribute('aria-invalid', 'true')
  expect(onChange).toHaveBeenLastCalledWith({ ...RULE, overCents: 2_500 })
})

test('a class or rank is set only when it names one in the census', async () => {
  const { onChange } = renderEditor()
  const field = screen.getByRole('combobox', { name: 'Class or rank' })
  await userEvent.type(field, 'E010')
  expect(onChange).not.toHaveBeenCalled()
  await userEvent.type(field, '4')
  expect(onChange).toHaveBeenLastCalledWith({
    ...RULE,
    scope: { ...ANY_SCOPE, position: 'E0104' },
  })
})

test('the first rule cannot move up, and moving down is named for its place', async () => {
  const { onMove } = renderEditor()
  expect(screen.getByRole('button', { name: 'Move rule 1 up' })).toBeDisabled()
  await userEvent.click(
    screen.getByRole('button', { name: 'Move rule 1 down' }),
  )
  expect(onMove).toHaveBeenCalledWith(1)
  expect(
    screen.getByRole('group', { name: /^1\. 10% off pay above/ }),
  ).toBeVisible()
})

test('an elimination picks an area or one of its units, and has no scope fields', async () => {
  const { onChange } = renderEditor({ kind: 'eliminate', code: '222000' })
  const field = screen.getByRole('combobox', { name: 'Department or area' })
  expect(field).toHaveDisplayValue('All of Arts & Sciences, College of')
  await userEvent.selectOptions(field, 'CAS Mathematics (223501)')
  expect(onChange).toHaveBeenLastCalledWith({
    kind: 'eliminate',
    code: '223501',
  })
  expect(screen.queryByRole('combobox', { name: /^Group/ })).toBeNull()
  expect(screen.getByRole('group', { name: '1. Eliminated' })).toBeVisible()
})

test('a raise freeze takes years and a cap of zero or more, over a scope', async () => {
  const rule: Rule = {
    kind: 'raises',
    scope: ANY_SCOPE,
    years: 1,
    capBasisPoints: 0,
  }
  const { onChange } = renderEditor(rule)
  const cap = screen.getByRole('textbox', { name: 'Cap raises at (%)' })
  await userEvent.clear(cap)
  await userEvent.type(cap, '1.5')
  expect(onChange).toHaveBeenLastCalledWith({ ...rule, capBasisPoints: 150 })
  const years = screen.getByRole('textbox', { name: 'Years' })
  await userEvent.clear(years)
  await userEvent.type(years, '3')
  expect(onChange).toHaveBeenLastCalledWith({ ...rule, years: 3 })
  expect(screen.getByRole('combobox', { name: 'Class or rank' })).toBeVisible()
})

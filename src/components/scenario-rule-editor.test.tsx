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

function renderEditor() {
  const onChange = vi.fn()
  const onMove = vi.fn()
  render(
    <ScenarioRuleEditor
      rule={RULE}
      position={1}
      count={2}
      areas={[]}
      positions={[['E0104', 'Office Specialist 2 (E0104)']]}
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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { TrendsControls } from './trends-controls'

const VIEW = {
  metric: 'spend',
  group: null,
  hide: ['Overloads'],
  kind: 'all',
  dept: null,
  position: null,
  from: 2014,
  to: 2025,
  fromYears: [2014],
  pair: 2024,
} as const

test('each control asks for a new search, and opening a group shows every line again', async () => {
  const handleChange = vi.fn()
  render(
    <TrendsControls
      view={{ ...VIEW, hide: [...VIEW.hide], fromYears: [...VIEW.fromYears] }}
      years={[2014, 2025]}
      lines={['Faculty', 'Overloads']}
      names={{ dept: null, position: null }}
      onChange={handleChange}
    />,
  )
  const user = userEvent.setup()
  await user.click(screen.getByRole('radio', { name: 'FTE' }))
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Group' }),
    'Faculty',
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Staff' }),
    'Classified',
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'From' }),
    '2025',
  )
  await user.click(screen.getByRole('checkbox', { name: 'Faculty' }))
  await user.click(screen.getByRole('checkbox', { name: 'Overloads' }))
  expect(handleChange.mock.calls.map(([search]) => search)).toEqual([
    { metric: 'fte' },
    { group: 'Faculty', hide: undefined },
    { kind: 'classified' },
    { from: 2025 },
    { hide: ['Overloads', 'Faculty'] },
    { hide: [] },
  ])
})

import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { emptyCounts } from '@/lib/trend-groups'
import { BinTable } from './bin-table'

const BIN = {
  label: 'Up 0% to 2%',
  counts: { ...emptyCounts(), Faculty: 1_200, 'Classified staff': 30 },
  total: 1_230,
}

test('each bin is a row headed by its label, with its count per group and in total', () => {
  render(
    <BinTable
      bins={[BIN]}
      groups={['Faculty', 'Classified staff']}
      heading="Change"
      caption="Jobs by change"
      rowKey={(bin) => bin.label}
      rowHeader={(bin) => bin.label}
    />,
  )
  const table = screen.getByRole('table', { name: 'Jobs by change' })
  expect(
    within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent),
  ).toEqual(['Change', 'Faculty', 'Classified staff', 'Total'])
  expect(
    within(table).getByRole('row', { name: /^Up 0% to 2% / }),
  ).toHaveTextContent('Up 0% to 2%1,200301,230')
  expect(
    within(table).getByRole('rowheader', { name: 'Up 0% to 2%' }),
  ).toBeVisible()
})

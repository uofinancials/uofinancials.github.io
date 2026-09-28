import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { PayChangeCountsTable } from './pay-change-counts-table'

test('a count over fewer than three jobs is left blank', () => {
  render(
    <PayChangeCountsTable
      caption="Counts"
      rows={[
        {
          fromYear: 2024,
          pairs: 5,
          classified: 2,
          classChanged: 1,
          unclassified: 3,
          rankChanged: 1,
          rankUnpublished: 0,
          titleChanged: 2,
        },
      ]}
    />,
  )
  const row = screen.getByRole('row', { name: /^2024-25/ })
  expect(
    within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent),
  ).toEqual(['5', '–', '1 (33.3%)', '0 (0.0%)', '2 (40.0%)'])
})

import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { Savings } from '@/lib/scenario'
import { ScenarioResultsTable } from './scenario-results-table'

const savings = (jobs: number, cents: number): Savings => ({
  jobs,
  salaryCents: cents,
  fullCostCents: null,
  egCents: cents / 2,
})

function renderTable(historyStatus: 'ready' | 'loading') {
  render(
    <ScenarioResultsTable
      rows={[
        {
          key: '0',
          position: 1,
          label: 'Pay capped at $900,000',
          scope: 'All jobs',
          result: { kind: 'census', savings: savings(1, 10_000_000) },
        },
        {
          key: '1',
          position: 3,
          label: 'A 1-year hiring freeze, then positions refilled',
          scope: 'classified',
          result: {
            kind: 'freeze',
            rateBasisPoints: 1_033,
            byYear: [savings(189, 90_000_000), savings(0, 0)],
          },
        },
      ]}
      total={savings(1, 10_000_000)}
      firstYear={2027}
      historyStatus={historyStatus}
    />,
  )
}

test('a freeze shows its first year and turnover, the total leaves it out, and a one-job rule carries the note', () => {
  renderTable('ready')
  const cells = (name: RegExp) =>
    within(screen.getByRole('row', { name }))
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
  expect(
    screen.getByRole('rowheader', { name: /^3\. A 1-year hiring freeze/ }),
  ).toHaveTextContent(
    'positions and savings in FY27, at 10.33% turnover a year',
  )
  expect(cells(/^3\./)).toEqual(['189', '$900,000', '–', '$450,000'])
  expect(cells(/^Census rules/)).toEqual(['1', '$100,000', '–', '$50,000'])
  expect(
    screen.getByRole('rowheader', { name: /^1\. Pay capped/ }),
  ).toHaveTextContent(/This rule reaches one job\./)
})

test('a freeze waiting on past censuses says so instead of showing figures', () => {
  renderTable('loading')
  expect(
    within(screen.getByRole('row', { name: /^3\./ })).getByRole('cell'),
  ).toHaveTextContent('Loading past censuses')
})

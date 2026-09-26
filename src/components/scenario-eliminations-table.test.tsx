import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { EliminationResult } from '@/lib/scenario'
import { ScenarioEliminationsTable } from './scenario-eliminations-table'

const elimination = (
  overrides: Partial<EliminationResult>,
): EliminationResult => ({
  kind: 'eliminate',
  code: '222000',
  name: 'Arts & Sciences, College of',
  isArea: true,
  jobs: 1_219,
  eg: { payCents: 600, opeCents: 300, servicesCents: -100 },
  egCents: 800,
  allFundsCents: 900,
  isPartlyMatched: false,
  isCovered: false,
  ...overrides,
})

test('each elimination shows its place in the stack, its E&G lines, and its notes, above the total', () => {
  render(
    <ScenarioEliminationsTable
      rows={[
        { position: 1, result: elimination({}) },
        {
          position: 3,
          result: elimination({
            code: '223501',
            name: 'CAS Mathematics',
            isArea: false,
            jobs: 1,
            isPartlyMatched: true,
          }),
        },
        {
          position: 4,
          result: elimination({
            code: '223100',
            name: 'CAS Biology',
            isArea: false,
            jobs: 0,
            isCovered: true,
          }),
        },
      ]}
      total={{ egCents: 1_600, allFundsCents: 1_800, fiscalYear: 2027 }}
      period="02"
    />,
  )
  const cells = (name: RegExp) =>
    within(screen.getByRole('row', { name }))
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
  expect(cells(/^1\. All of Arts & Sciences/)).toEqual([
    '1,219',
    '$6',
    '$3',
    '-$1',
    '$8',
    '$9',
  ])
  const math = screen.getByRole('rowheader', { name: /^3\. CAS Mathematics/ })
  expect(math).toHaveTextContent(
    /files most of this unit's staff under other codes/,
  )
  expect(math).toHaveTextContent(/This rule reaches one job\./)
  expect(
    screen.getByRole('rowheader', { name: /^4\. CAS Biology/ }),
  ).toHaveTextContent(/already covers this unit/)
  expect(cells(/^Eliminations/).slice(-2)).toEqual(['$16', '$18'])
  expect(screen.getByText(/FY27 budget as of posting period 2/)).toBeVisible()
})

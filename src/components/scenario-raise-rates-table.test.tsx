import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { ScenarioRaiseRatesTable } from './scenario-raise-rates-table'

test("each group's first-year raise is shown with its cited sources, or as the projection's 3%", () => {
  render(
    <ScenarioRaiseRatesTable
      firstYear={2027}
      rates={[
        {
          row: null,
          label: 'Officers of Administration',
          basisPoints: 375,
          sources: [
            {
              url: 'https://example.org/oa',
              document: 'OA Salary Increase Information',
              location: 'Multiyear plan',
              retrievedOn: '2026-09-24',
            },
          ],
        },
        { row: null, label: 'Other jobs', basisPoints: 300, sources: [] },
      ]}
    />,
  )
  const oa = screen.getByRole('row', { name: /^Officers of Administration/ })
  expect(within(oa).getAllByRole('cell')[0]).toHaveTextContent('3.75%')
  expect(
    within(oa).getByRole('link', { name: 'OA Salary Increase Information' }),
  ).toHaveAttribute('href', 'https://example.org/oa')
  expect(oa).toHaveTextContent('retrieved 2026-09-24')
  expect(screen.getByRole('row', { name: /^Other jobs/ })).toHaveTextContent(
    "3%The projection's 3% for groups without a settled contract",
  )
  expect(
    screen.getByText(/After FY27, 3% a year for every group/),
  ).toBeVisible()
})

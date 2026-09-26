import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { ScenarioSavingsTotal } from './scenario-savings-total'

test('the share of the reduction estimate counts eliminations, and names them only when there are any', () => {
  const { rerender } = render(
    <ScenarioSavingsTotal
      totalCents={650_000_000}
      eliminatedCents={null}
      reductionTargetCents={6_500_000_000}
    />,
  )
  expect(
    screen.getByText(
      /^The census rules' E&G savings are 10(\.0)?% of the Board's \$65,000,000/,
    ),
  ).toBeVisible()
  rerender(
    <ScenarioSavingsTotal
      totalCents={1_300_000_000}
      eliminatedCents={650_000_000}
      reductionTargetCents={6_500_000_000}
    />,
  )
  expect(
    screen.getByText(
      /\$13,000,000 a year with \$6,500,000 from eliminations, are 20(\.0)?%/,
    ),
  ).toBeVisible()
})

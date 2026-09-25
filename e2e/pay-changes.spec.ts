/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

test('pay changes show each census pair’s median by group, the change counts, and one pair’s distribution held in the link', async ({
  page,
}) => {
  await page.goto('/pay-changes')
  const main = page.getByRole('main')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Pay changes' }),
  ).toBeVisible()
  const lines = page.getByRole('table', {
    name: /^Median change in salary rate/,
  })
  await expect(
    lines.getByRole('row', { name: /^2024-25 \+7\.9%/ }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('table', { name: /changed class, rank, or title/ })
      .getByRole('row', { name: /^2024-25 4,865 / }),
  ).toContainText('169 (')
  await expect(
    page
      .getByRole('figure', { name: /by change in salary rate, Fall 2024-25/ })
      .locator('.recharts-bar-rectangle'),
  ).not.toHaveCount(0)
  await page.getByRole('combobox', { name: 'Fall' }).selectOption('2021')
  await expect(page).toHaveURL(/pair=2021/)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: /Fall 2021-22$/ }),
  ).toBeVisible()
  await expect(main).toContainText('Teaching Assistant Professor')
  await expect(
    page.getByRole('link', { name: 'Fall 2014-2025 Census salary reports' }),
  ).toBeVisible()
  await page.goto('/pay-changes?dept=000000')
  await expect(main).toContainText('0 continuing jobs match')
})

test('a person links to pay changes for their class or rank, the filter can be removed, and the page does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/people?q=smith+j')
  await page
    .getByRole('list', { name: 'Matching names' })
    .getByRole('link')
    .nth(1)
    .click()
  await page
    .getByRole('link', { name: /^Pay changes, / })
    .last()
    .click()
  await expect(page).toHaveURL(/\/pay-changes\?.*position=/)
  const main = page.getByRole('main')
  await expect(main).toContainText('Class or rank: ')
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page).not.toHaveURL(/position=/)
})

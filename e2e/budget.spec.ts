/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

test('the budget page shows the projected E&G gap by year, its scope, and its source', async ({
  page,
}) => {
  await page.goto('/budget')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Budget outlook' }),
  ).toBeVisible()
  const main = page.getByRole('main')
  await expect(main).toContainText('E&G fund only')
  const gap = page.getByRole('table', { name: /run rate, and ending fund/ })
  await expect(gap.getByRole('row', { name: /^FY31/ })).toContainText(
    '-$73,143,868',
  )
  await expect(gap.getByRole('row', { name: /^FY27/ })).toContainText(
    '-$22,770,593',
  )
  await expect(main).toContainText(
    'the FY26 unaudited fourth-quarter actual run rate is $4,786,863',
  )
  await expect(main).toContainText('-$63,264,695')
  await expect(
    page.getByRole('row', { name: /^100 fewer nonresident/ }),
  ).toContainText('-$86,360,984')
  await expect(
    page
      .getByRole('link', {
        name: 'Board of Trustees meeting materials, June 1-2, 2026, agenda item 4',
      })
      .first(),
  ).toHaveAttribute('href', /full-bot-materials-web2\.pdf$/)
  await expect(
    page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Budget' }),
  ).toHaveAttribute('aria-current', 'page')
})

test('the budget page does not scroll sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/budget')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Budget outlook' }),
  ).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

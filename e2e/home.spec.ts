import { expect, test } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/^UO Financials \| An independent look/)
})

test('home page states it is not affiliated with UO', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('contentinfo').getByText(/not affiliated with/),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Report it' })).toBeVisible()
})

/// <reference lib="dom" />
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/^UO Financials \| An independent look/)
})

for (const path of ['/', '/sources', '/no-such-page']) {
  test(`${path} states it is not affiliated with UO`, async ({ page }) => {
    await page.goto(path)
    await expect(
      page.getByRole('contentinfo').getByText(/not affiliated with/),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Report it' })).toBeVisible()
  })
}

test('an unknown path shows the not-found page', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(
    page.getByRole('heading', { name: 'Page not found' }),
  ).toBeVisible()
})

test('the build serves the app as 404.html for clean paths on Pages', () => {
  expect(readFileSync('dist/404.html', 'utf8')).toBe(
    readFileSync('dist/index.html', 'utf8'),
  )
})

test('the sources page lists every committed dataset', async ({ page }) => {
  await page.goto('/sources')
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
  for (let year = 2014; year <= 2025; year++) {
    await expect(page.locator(`#fall-${year}`)).toContainText(`${year}-1`)
  }
  for (let year = 21; year <= 27; year++) {
    await expect(page.locator(`#budget-fy${year}`)).toContainText(`FY${year}`)
  }
  await expect(page.locator('#rates')).toContainText('Blended-OPE-Rate-History')
  await expect(
    page.getByRole('columnheader', { name: 'Possible students' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'United Academics CBA 2025-2027' }),
  ).toBeVisible()
})

test('the sources page does not scroll sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/sources')
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

test('the overview shows the latest census totals, groups, and sources', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: /Fall 2025/ }),
  ).toBeVisible()
  const main = page.getByRole('main')
  await expect(main).toContainText('6,268')
  await expect(main).toContainText('6,099.4')
  await expect(main).toContainText('$504,812,068')
  await expect(
    page.getByRole('rowheader', { name: 'Faculty', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('rowheader', { name: 'Arts & Sciences, College of' }),
  ).toBeVisible()
  await expect(
    page.getByRole('rowheader', { name: 'Classified temporaries' }),
  ).toHaveCount(2)
  await expect(
    page.getByRole('link', { name: 'Fall 2025 Census salary reports' }),
  ).toHaveCount(3)
  await expect(
    page.getByRole('link', { name: 'FY26 operational expenditure budget' }),
  ).toBeVisible()
  await expect(main).toContainText('0 not assigned')
  await expect(
    page
      .getByRole('figure', { name: 'Salary spend by EEO category' })
      .locator('path'),
  ).toHaveCount(13)
})

test('the overview does not scroll sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

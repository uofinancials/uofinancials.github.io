/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

test('the home page leads with cited headlines and the projected gap', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'UO Financials' }),
  ).toBeVisible()
  const main = page.getByRole('main')
  await expect(
    main.getByRole('link', { name: /FY27 projected E&G run rate/ }),
  ).toContainText('-$22,770,593')
  await expect(
    main.getByRole('link', { name: /FY26 budget, all funds/ }),
  ).toContainText('$1,768,500,895')
  await expect(
    main.getByRole('link', { name: /Fall 2025 salary spend/ }),
  ).toContainText('$504,812,068')
  await expect(
    main.getByRole('link', { name: /Fall 2025 people/ }),
  ).toContainText('6,268')
  await expect(
    page.getByRole('figure', {
      name: 'Projected E&G run rate and ending fund balance by fiscal year',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Board of Trustees meeting materials' }),
  ).not.toHaveCount(0)
  await main.getByRole('link', { name: /FY26 budget, all funds/ }).click()
  await expect(page).toHaveURL(/\/departments$/)
})

test('a scenario answer states its estimate and opens the same savings on the scenarios page', async ({
  page,
}) => {
  await page.goto('/')
  const main = page.getByRole('main')
  await expect(main).toContainText(
    'About $1,442,675 of E&G savings in FY27, 6.3% of the projected FY27 shortfall.',
  )
  await expect(main).toContainText('not recommendations about any person')
  await page
    .getByRole('link', { name: 'What would 10% off pay above $200,000 save?' })
    .click()
  await expect(page).toHaveURL(/\/scenarios\?rules=/)
  const outlook = page.getByRole('table', { name: /savings by fiscal year/ })
  await expect(outlook.getByRole('row', { name: /^FY27/ })).toContainText(
    '$1,442,675',
  )
})

test('the area preview switches measure in the link and links each area', async ({
  page,
}) => {
  await page.goto('/')
  const areas = page.getByRole('table', {
    name: 'The 10 largest colleges and VP areas by FY26 budget',
  })
  await expect(areas.getByRole('rowheader').first()).toHaveText(
    'Business Affairs',
  )
  await page.getByRole('radio', { name: 'Fall 2025 jobs' }).check()
  await expect(page).toHaveURL(/measure=jobs/)
  const byJobs = page.getByRole('table', {
    name: 'The 10 largest colleges and VP areas by Fall 2025 jobs',
  })
  await expect(byJobs.getByRole('rowheader').first()).toHaveText(
    'Arts & Sciences, College of',
  )
  await page.reload()
  await expect(
    page.getByRole('radio', { name: 'Fall 2025 jobs' }),
  ).toBeChecked()
  await byJobs
    .getByRole('link', { name: 'Arts & Sciences, College of' })
    .click()
  await expect(page).toHaveURL(/\/departments\/222000/)
})

test('the trend and top-paid previews link to their pages', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('figure', {
      name: 'Job records published per Fall census, 2014-2025',
    }),
  ).toBeVisible()
  const top = page.getByRole('table', {
    name: 'The highest published annual salary rates, Fall 2025',
  })
  await expect(top.getByRole('row')).toHaveCount(11)
  await expect(top.getByRole('row').nth(1)).toContainText('$9,400,000')
  await page.getByRole('link', { name: 'See every job by rate' }).click()
  await expect(page).toHaveURL(/\/people\?.*sort=rate/)
  await expect(page).toHaveURL(/dir=desc/)
})

test('the home page does not scroll sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

test('people shows salary spend by EEO category for the matching jobs', async ({
  page,
}) => {
  await page.goto('/people')
  await expect(
    page.getByRole('heading', { name: 'Salary spend by EEO category' }),
  ).toBeVisible()
  await expect(
    page.getByRole('rowheader', { name: 'Faculty', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('rowheader', { name: 'Classified temporaries' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('figure', { name: 'Salary spend by EEO category' })
      .locator('path'),
  ).toHaveCount(13)
})

/// <reference lib="dom" />
import { expect, type Page, test } from '@playwright/test'

const pageWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth)

test('the departments index ranks areas by budget, and a header sort is held in the link', async ({
  page,
}) => {
  await page.goto('/departments')
  const table = page.getByRole('table', {
    name: 'Colleges and VP areas: FY26 budget and Fall 2025 jobs',
  })
  await expect(
    table.getByRole('columnheader', { name: 'Budget ▼' }),
  ).toHaveAttribute('aria-sort', 'descending')
  await expect(table.getByRole('row').nth(1)).toContainText('Business Affairs')
  await expect(
    table.getByRole('link', { name: 'Arts & Sciences, College of' }),
  ).toBeVisible()
  await table.getByRole('button', { name: 'Jobs', exact: true }).click()
  await expect(page).toHaveURL(/sort=jobs/)
  await expect(page).toHaveURL(/dir=asc/)
  await page.reload()
  await expect(
    table.getByRole('columnheader', { name: 'Jobs ▲' }),
  ).toHaveAttribute('aria-sort', 'ascending')
  await expect(table.getByRole('row').nth(1)).toContainText(
    'Provost Academic Allocation Model',
  )
})

test('the units view narrows by area and by text, and a pay department links to its pay changes', async ({
  page,
}) => {
  await page.goto('/departments')
  await page.getByRole('radio', { name: 'Units and pay departments' }).check()
  await expect(page).toHaveURL(/level=units/)
  await page
    .getByRole('combobox', { name: 'Area' })
    .selectOption({ label: 'Music and Dance, School of' })
  await expect(page).toHaveURL(/area=(%22)?229000/)
  const table = page.getByRole('table', { name: /^Units and pay departments/ })
  await expect(table.getByRole('row')).toHaveCount(19)
  await page
    .getByRole('searchbox', { name: 'Filter by name or code' })
    .fill('music')
  await expect(page).toHaveURL(/q=music/)
  await expect(table.getByRole('link', { name: 'SOMD Dance' })).toHaveCount(0)
  await table.getByRole('link', { name: 'SOMD Music', exact: true }).click()
  await expect(page).toHaveURL(/\/departments\/229100$/)
  const main = page.getByRole('main')
  await expect(main).toContainText(
    'UO’s budget publishes no unit or area with code 229100',
  )
  await expect(main).toContainText('$7,826,769')
  await expect(
    page.getByRole('link', { name: 'Music and Dance, School of' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Eliminate in a scenario' }),
  ).toHaveCount(0)
  await page.getByRole('link', { name: 'Pay changes' }).click()
  await expect(page).toHaveURL(/\/trends\?.*metric=change/)
  await expect(main).toContainText('SOMD Music')
})

test('the departments index does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/departments?level=units')
  await expect(
    page.getByRole('table', { name: /^Units and pay departments/ }),
  ).toBeVisible()
  expect(await pageWidth(page)).toBeLessThanOrEqual(360)
})

test('a unit shows its budget and its jobs, and its views are held in the link', async ({
  page,
}) => {
  await page.goto('/departments/223100')
  const main = page.getByRole('main')
  await expect(
    page.getByRole('heading', { level: 1, name: /CAS Biology/ }),
  ).toBeVisible()
  await expect(main).toContainText('$9,880,235')
  await expect(
    page.getByRole('columnheader', { name: 'FY26 (period 12)' }),
  ).toBeVisible()
  await expect(main).toContainText('excludes sponsored research funds')
  await expect(
    page.getByRole('link', {
      name: 'FY21-FY27 operational expenditure budgets',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Fall 2014-2025 Census salary reports' }),
  ).toBeVisible()
  await page.getByRole('radio', { name: 'Fund type' }).check()
  await expect(page).toHaveURL(/budget=fund/)
  await expect(
    page.getByRole('rowheader', { name: 'Budgeted Operations' }),
  ).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Classes in Fall' })
    .selectOption('2020')
  await expect(page).toHaveURL(/year=2020/)
  await expect(
    page.getByRole('rowheader', {
      name: 'Other ranks (fewer than 3 jobs each)',
    }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Budget by fund type' }),
  ).toBeVisible()
  await expect(
    page.getByRole('combobox', { name: 'Classes in Fall' }),
  ).toHaveValue('2020')
})

test('an area lists its units, states how its jobs were placed, and does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/departments/222000')
  await expect(
    page.getByRole('heading', { level: 1, name: /Arts & Sciences/ }),
  ).toBeVisible()
  const units = page.getByRole('table', {
    name: 'FY26 budget and Fall 2025 jobs, with changes from FY25 and Fall 2024',
  })
  await expect(units.getByRole('link', { name: 'CAS Biology' })).toBeVisible()
  await expect(units.getByRole('columnheader', { name: 'Area' })).toHaveCount(0)
  await units.getByRole('button', { name: 'Name' }).click()
  await expect(page).toHaveURL(/sort=name/)
  await expect(
    page.getByRole('table', { name: 'How the area’s jobs were placed' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pay changes' })).toHaveCount(0)
  expect(await pageWidth(page)).toBeLessThanOrEqual(360)
})

test('a unit in the scenario budget opens a scenario that eliminates it', async ({
  page,
}) => {
  await page.goto('/departments/223100')
  await page.getByRole('link', { name: 'Eliminate in a scenario' }).click()
  await expect(page).toHaveURL(/\/scenarios\?rules=/)
  await expect(
    page.getByRole('row', { name: /^1\. CAS Biology \(223100\)/ }),
  ).toBeVisible()
})

test('a code no source publishes is not found', async ({ page }) => {
  await page.goto('/departments/000000')
  await expect(
    page.getByRole('heading', { name: 'Page not found' }),
  ).toBeVisible()
  await page.goto('/departments/nope')
  await expect(
    page.getByRole('heading', { name: 'Page not found' }),
  ).toBeVisible()
})

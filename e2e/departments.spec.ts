/// <reference lib="dom" />
import { expect, type Page, test } from '@playwright/test'
import { collectDataFiles, openSources } from './sources.ts'

const pageWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth)

const areasChart = (page: Page) =>
  page.getByRole('list', { name: 'FY26 budget by college and VP area' })

test('the departments index ranks areas by budget with their changes, and a header sort is held in the link', async ({
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
  // 1,273 jobs placed in the area in Fall 2025 against 1,369 in Fall 2024.
  await expect(
    table.getByRole('row', { name: /^Arts & Sciences, College of/ }),
  ).toContainText(/1,273.*-7\.0%/)
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
  await expect(page).toHaveURL(/\/trends\/pay-changes\?dept=/)
  await expect(main).toContainText('SOMD Music')
})

test('the chart draws every area with a budget above zero, largest first, and its measure is held in the link', async ({
  page,
}) => {
  await page.goto('/departments')
  const chart = areasChart(page)
  await expect(chart.getByRole('listitem')).toHaveCount(47)
  // $240,032,405 of the $1,769,586,629 drawn; the budget rose 2.7% and Research's fell 2.8%.
  const largest = chart.getByRole('link').first()
  await expect(largest).toHaveAccessibleName(
    'Business Affairs: $240,032,405, 13.6% of the budget drawn, +2.7% from FY25',
  )
  await expect(largest).toContainText('$240M')
  await expect(largest).toHaveClass(/bg-tile-rose/)
  await expect(
    chart.getByRole('link', {
      name: 'Research: $95,396,296, 5.4% of the budget drawn, -2.8% from FY25',
    }),
  ).toHaveClass(/bg-tile-fell/)
  const main = page.getByRole('main')
  await expect(main).toContainText('Rose from FY25')
  await expect(main).toContainText(
    '2 areas with no budget above zero are not drawn; the table lists them.',
  )

  await page.getByRole('radio', { name: 'Fall 2025 jobs' }).check()
  await expect(page).toHaveURL(/measure=jobs/)
  await page.reload()
  const byJobs = page.getByRole('list', {
    name: 'Fall 2025 jobs by college and VP area',
  })
  // 1,273 of the 6,840 jobs placed in an area.
  await expect(byJobs.getByRole('link').first()).toHaveAccessibleName(
    'Arts & Sciences, College of: 1,273 jobs, 18.6% of the jobs drawn, -7.0% from Fall 2024',
  )
  await expect(main).toContainText('Rose from Fall 2024')
  await expect(
    page.getByRole('columnheader', { name: 'Budget ▼' }),
  ).toHaveAttribute('aria-sort', 'descending')
})

test('an area’s tile draws its units and narrows the table to them, a unit’s opens its page, and All areas returns', async ({
  page,
}) => {
  await page.goto('/departments')
  await areasChart(page)
    .getByRole('link', { name: /^Arts & Sciences, College of: / })
    .click()
  await expect(page).toHaveURL(/level=units/)
  await expect(page).toHaveURL(/area=.*222000/)
  const units = page.getByRole('list', {
    name: 'FY26 budget by unit in Arts & Sciences, College of',
  })
  // 77 of the area's 86 units have a budget above zero.
  await expect(units.getByRole('listitem')).toHaveCount(77)
  await expect(page.getByRole('main')).toContainText(
    '9 units with no budget above zero are not drawn',
  )
  const table = page.getByRole('table', { name: /^Units and pay departments/ })
  await expect(table.getByRole('row')).toHaveCount(87)

  await page.getByLabel('Filter by name or code').fill('biology')
  await expect(table.getByRole('row')).toHaveCount(3)
  await expect(units.getByRole('listitem')).toHaveCount(77)
  await page.getByLabel('Filter by name or code').fill('')
  await expect(table.getByRole('row')).toHaveCount(87)

  // $13,266,027 of the $208,920,683 drawn.
  await units
    .getByRole('link', {
      name: 'CAS Psychology: $13,266,027, 6.3% of the budget drawn, +20.4% from FY25',
    })
    .click()
  await expect(page).toHaveURL(/\/departments\/223520$/)
  await page.goBack()
  await page.getByRole('link', { name: 'All areas' }).click()
  await expect(page).not.toHaveURL(/area=|level=/)
  await expect(areasChart(page)).toBeVisible()
  await expect(
    page.getByRole('table', { name: /^Colleges and VP areas/ }),
  ).toBeVisible()
})

test('a tile’s exact figure, share, and change show beside it on hover and on keyboard focus, and a skip link leads past the tiles', async ({
  page,
}) => {
  await page.goto('/departments')
  const chart = areasChart(page)
  const tooltip = page.getByRole('tooltip')
  await chart.getByRole('link', { name: /^Athletics: / }).hover()
  await expect(tooltip).toContainText('$211,911,651')
  // $211,911,651 of the $1,769,586,629 drawn.
  await expect(tooltip).toContainText('12.0% of the budget drawn')
  await expect(tooltip).toContainText('+18.9% from FY25')
  await page.getByRole('heading', { level: 1 }).hover()
  await expect(tooltip).toHaveCount(0)

  const skip = page.getByRole('link', { name: 'Skip to the table' })
  await skip.focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('radio', { name: 'FY26 budget' })).toBeFocused()
  await page.keyboard.press('Tab')
  const largest = chart.getByRole('link').first()
  await expect(largest).toBeFocused()
  await expect(tooltip).toContainText('Business Affairs')
  await expect(tooltip).toContainText('$240,032,405')

  await skip.focus()
  await expect(skip).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.locator('#departments-table')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('radio', { name: 'Colleges and VP areas' }),
  ).toBeFocused()
})

test('on a phone the chart is drawn in a tall box, and the page does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/departments')
  const chart = areasChart(page)
  await expect(chart).toHaveCount(1)
  await expect(chart.getByRole('listitem')).toHaveCount(47)
  const box = await chart.boundingBox()
  expect(box?.height).toBeGreaterThan(box?.width ?? 0)
  expect(await pageWidth(page)).toBeLessThanOrEqual(360)
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
  await openSources(page)
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
  expect(await pageWidth(page)).toBeLessThanOrEqual(360)
  await page.getByRole('link', { name: 'Pay changes' }).click()
  await expect(page).toHaveURL(/\/trends\/pay-changes\?area=.*222000/)
  const main = page.getByRole('main')
  await expect(main).toContainText(
    'College or VP area: Arts & Sciences, College of',
  )
  await expect(main).toContainText('whose pay department the site places in it')
  const areaPairs = page.getByRole('row', { name: /^2024-25 972 / })
  await expect(areaPairs).toBeVisible()
  await page
    .getByRole('button', { name: /^Remove College or VP area: / })
    .click()
  await expect(page).not.toHaveURL(/area=/)
  await expect(areaPairs).toHaveCount(0)
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

test('a department page loads its own figures, and no census or budget year', async ({
  page,
}) => {
  const dataFiles = collectDataFiles(page)
  await page.goto('/departments/222000')
  await expect(
    page.getByRole('heading', { level: 2, name: 'Units in this area' }),
  ).toBeVisible()
  await expect(
    page.getByRole('table', { name: 'How the area’s jobs were placed' }),
  ).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect([...dataFiles].sort()).toEqual([
    'departments.json',
    'departments/222000.json',
    'manifest.json',
    'outlook.json',
  ])
})

test('a pay code that only an older census publishes has a page', async ({
  page,
}) => {
  await page.goto('/departments/110502')
  await expect(
    page.getByRole('heading', { level: 1, name: /^KCIP BGMP Old/ }),
  ).toBeVisible()
  await expect(page.getByRole('main')).toContainText(
    'UO’s budget publishes no unit or area with code 110502',
  )
  await expect(
    page.getByRole('combobox', { name: 'Classes in Fall' }),
  ).toHaveValue('2023')
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

test('an alias code leads to its unit, which names the code it was also published under', async ({
  page,
}) => {
  await page.goto('/departments/530000')
  await expect(page).toHaveURL(/\/departments\/531111$/)
  await expect(
    page.getByRole('heading', { level: 1, name: /Jordan Schnitzer/ }),
  ).toBeVisible()
  await expect(page.getByRole('main')).toContainText(
    'Jobs the census pays under codes 530000, 535000 are counted here',
  )
})

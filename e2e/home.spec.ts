/// <reference lib="dom" />
import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/^UO Financials \| An independent look/)
})

for (const path of [
  '/',
  '/trends',
  '/departments',
  '/departments/223100',
  '/salaries',
  '/people',
  '/pay-changes',
  '/sources',
  '/no-such-page',
]) {
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

test('trends show every census by group, and a group opens into its published categories', async ({
  page,
}) => {
  await page.goto('/trends')
  const main = page.getByRole('main')
  await expect(
    page.getByRole('heading', {
      name: 'Salary spend by group, Fall 2014-2025',
    }),
  ).toBeVisible()
  await expect(main).toContainText('$295,679,251')
  await expect(main).toContainText('$504,812,068')
  await expect(
    page.getByRole('link', { name: 'Fall 2014-2025 Census salary reports' }),
  ).toBeVisible()
  await expect(
    page.getByRole('columnheader', { name: 'Classified temporaries' }),
  ).toHaveCount(0)
  await page.getByRole('radio', { name: 'FTE' }).check()
  await expect(page).toHaveURL(/metric=fte/)
  await expect(
    page.getByRole('columnheader', { name: 'Classified temporaries' }),
  ).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Group' })
    .selectOption('Admins and professionals')
  await expect(
    page.getByRole('columnheader', { name: 'Senior Administrators' }),
  ).toBeVisible()
  await page.getByRole('combobox', { name: 'From' }).selectOption('2018')
  await expect(
    page.getByRole('columnheader', { name: 'Exec/Admin/Mgr' }),
  ).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByRole('heading', {
      name: 'FTE by EEO category in Admins and professionals, Fall 2018-2025',
    }),
  ).toBeVisible()
})

test('trends lines can be hidden and the page does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/trends')
  const lines = page
    .getByRole('figure', { name: /Salary spend by group/ })
    .locator('.recharts-line')
  await expect(lines).toHaveCount(6)
  await page.getByRole('checkbox', { name: 'Faculty' }).uncheck()
  await expect(lines).toHaveCount(5)
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

test('the departments index lists areas with their units, and the filter narrows it', async ({
  page,
}) => {
  await page.goto('/departments')
  await expect(
    page.getByRole('link', { name: 'Arts & Sciences, College of' }),
  ).toBeVisible()
  await page
    .getByRole('searchbox', { name: 'Filter by name or code' })
    .fill('music')
  await expect(page).toHaveURL(/q=music/)
  await expect(
    page.getByRole('link', { name: 'SOMD Music', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Arts & Sciences, College of' }),
  ).toHaveCount(0)
  await page.getByRole('link', { name: 'SOMD Music', exact: true }).click()
  await expect(page).toHaveURL(/\/departments\/229100$/)
  const main = page.getByRole('main')
  await expect(main).toContainText(
    'UO’s budget publishes no unit or area with code 229100',
  )
  await expect(main).toContainText('$7,826,769')
  await expect(
    page.getByRole('link', { name: 'Music and Dance, School of' }),
  ).toBeVisible()
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

test('an area states how its jobs were placed, and the page does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/departments/222000')
  await expect(
    page.getByRole('heading', { level: 1, name: /Arts & Sciences/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('table', { name: 'How the area’s jobs were placed' }),
  ).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
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

test('salary rates show the latest census by job kind, and each filter is held in the link', async ({
  page,
}) => {
  await page.goto('/salaries')
  const main = page.getByRole('main')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Salary rates, Fall 2025' }),
  ).toBeVisible()
  await expect(main).toContainText('$75,787')
  await expect(main).toContainText('$9,400,000')
  await expect(
    page.getByRole('rowheader', { name: '$250,000 and over' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Fall 2025 Census salary reports' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('figure', { name: /jobs by salary rate/ })
      .locator('.recharts-bar-rectangle'),
  ).not.toHaveCount(0)
  await page.getByRole('combobox', { name: 'Term' }).selectOption('9')
  await expect(page).toHaveURL(/term=9/)
  await page.getByRole('combobox', { name: 'Group' }).selectOption('Faculty')
  await page
    .getByRole('combobox', { name: 'College or VP area' })
    .selectOption({ label: 'Arts & Sciences, College of' })
  await page.getByRole('combobox', { name: 'Fall census' }).selectOption('2014')
  await page.reload()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Salary rates, Fall 2014' }),
  ).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Group' })).toHaveValue(
    'Faculty',
  )
  await expect(
    page.getByRole('combobox', { name: 'College or VP area' }),
  ).toHaveValue('222000')
})

test('a department page links to its salary distribution, and the department filter can be removed', async ({
  page,
}) => {
  await page.goto('/departments/223100?year=2020')
  await page
    .getByRole('link', { name: 'Salary distribution, Fall 2020' })
    .click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Salary rates, Fall 2020' }),
  ).toBeVisible()
  const main = page.getByRole('main')
  await expect(main).toContainText('Department: CAS Biology (223100)')
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(main).not.toContainText('Department: CAS Biology')
  await page.goto('/salaries?dept=000000')
  await expect(main).toContainText('No jobs for code 000000 in Fall 2025')
  await expect(main).toContainText('0 jobs match')
})

test('the salaries page does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/salaries')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

test('people search by every word of a name, and a chosen name shows its records with its sources', async ({
  page,
}) => {
  await page.goto('/people')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex',
  )
  await page.getByRole('searchbox', { name: 'Search by name' }).fill('smith j')
  await expect(page).toHaveURL(/q=smith/)
  const matches = page.getByRole('list', { name: 'Matching names' })
  const first = matches.getByRole('link').first()
  const name = await first.textContent()
  expect(name).toMatch(/smith.* j/i)
  await first.click()
  await expect(page).toHaveURL(/name=/)
  await page.reload()
  await expect(
    page.getByRole('heading', { level: 2, name: name ?? '' }),
  ).toBeVisible()
  await expect(
    page.getByRole('rowheader', { name: 'Annual salary rate' }).first(),
  ).toBeVisible()
  await expect(
    page
      .getByRole('link', { name: /^Fall \d{4} Census salary reports$/ })
      .first(),
  ).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
})

async function openLinkedPerson(page: Page) {
  await page.goto('/people?q=smith+j')
  const matches = page.getByRole('list', { name: 'Matching names' })
  await matches.getByRole('link').nth(1).click()
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
}

test('a person’s computed figures, rate chart, and class median are labelled, and the view does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await openLinkedPerson(page)
  const main = page.getByRole('main')
  await expect(main).toContainText(
    'Computed by this site from the records below, not published by UO. From Fall 2021-2023, years linked on the exact name and the same pay department of a single primary job.',
  )
  await expect(
    page.getByRole('figure', { name: /annual salary rate by job/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('columnheader', { name: /^Primary · / }).first(),
  ).toBeVisible()
  await expect(
    page.getByRole('columnheader', {
      name: 'Median rate, primary job’s class or rank',
    }),
  ).toBeVisible()
  await expect(main).toContainText('Groups used: ')
  await expect(page.getByRole('heading', { name: 'Job history' })).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

test('census tabs are held in the link and lead to the class distribution, and the search view cites its sources', async ({
  page,
}) => {
  await openLinkedPerson(page)
  await expect(
    page.getByRole('heading', { name: 'Fall 2023 records' }),
  ).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Census year' })
    .getByRole('link', { name: '2021', exact: true })
    .click()
  await expect(page).toHaveURL(/year=2021/)
  await expect(
    page.getByRole('heading', { name: 'Fall 2021 records' }),
  ).toBeVisible()
  const distributions = page.getByRole('link', {
    name: /^Salary distribution, .+, Fall 2021$/,
  })
  await expect(distributions.first()).toBeVisible()
  await distributions.last().click()
  await expect(page).toHaveURL(/\/salaries\?.*position=/)
  await expect(page.getByRole('main')).toContainText('Class or rank: ')
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page).not.toHaveURL(/position=/)
  await page.goto('/people?q=smith')
  await expect(
    page.getByRole('link', { name: 'Fall 2014-2025 Census salary reports' }),
  ).toBeVisible()
  await page.goto('/people?q=zzzz')
  await expect(page.getByRole('main')).toContainText('No name matches.')
})

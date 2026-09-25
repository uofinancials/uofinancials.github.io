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
  '/people',
  '/people/No such name',
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

test('trends Executives opens into its categories and one line for the EXEC grade alone', async ({
  page,
}) => {
  await page.goto('/trends?group=Executives&from=2018')
  await expect(
    page.getByRole('columnheader', { name: 'Executive Admins' }),
  ).toBeVisible()
  await expect(
    page.getByRole('columnheader', { name: 'EXEC grade, other category' }),
  ).toBeVisible()
  await expect(
    page.getByRole('columnheader', { name: 'Senior Administrators' }),
  ).toHaveCount(0)
})

test('trends lines can be hidden and the page does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/trends')
  const lines = page
    .getByRole('figure', { name: /Salary spend by group/ })
    .locator('.recharts-line')
  await expect(lines).toHaveCount(7)
  await page.getByRole('checkbox', { name: 'Faculty' }).uncheck()
  await expect(lines).toHaveCount(6)
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

test('the people chart shows the latest census by salary rate, and each filter is held in the link', async ({
  page,
}) => {
  await page.goto('/people')
  const main = page.getByRole('main')
  await expect(
    page.getByRole('heading', { level: 1, name: 'People, Fall 2025' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('figure', { name: /jobs by salary rate/ })
      .locator('.recharts-bar-rectangle'),
  ).not.toHaveCount(0)
  await page.getByText('The chart’s numbers').click()
  await expect(main).toContainText('$75,787')
  await expect(main).toContainText('$9,400,000')
  await expect(
    page.getByRole('rowheader', { name: '$250,000 and over' }),
  ).toBeVisible()
  await page.getByRole('combobox', { name: 'Term' }).selectOption('9')
  await expect(page).toHaveURL(/term=9/)
  await page.getByRole('combobox', { name: 'Group' }).selectOption('Faculty')
  await page
    .getByRole('combobox', { name: 'College or VP area' })
    .selectOption({ label: 'Arts & Sciences, College of' })
  await page.getByRole('combobox', { name: 'Fall census' }).selectOption('2014')
  await page.reload()
  await expect(
    page.getByRole('heading', { level: 1, name: 'People, Fall 2014' }),
  ).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Group' })).toHaveValue(
    'Faculty',
  )
  await expect(
    page.getByRole('combobox', { name: 'College or VP area' }),
  ).toHaveValue('222000')
})

test('a department page links to its jobs, and the department filter can be removed', async ({
  page,
}) => {
  await page.goto('/departments/223100?year=2020')
  await page.getByRole('link', { name: 'Jobs by name, Fall 2020' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'People, Fall 2020' }),
  ).toBeVisible()
  const main = page.getByRole('main')
  await expect(main).toContainText('Department: CAS Biology (223100)')
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(main).not.toContainText('Department: CAS Biology')
  await page.goto('/people?dept=000000')
  await expect(main).toContainText('No jobs for code 000000 in Fall 2025')
  await expect(main).toContainText('0 jobs, 0 names match')
})

test('people search by every word of a name, and a chosen name shows its records with its sources', async ({
  page,
}) => {
  await page.goto('/people')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex',
  )
  await page.getByRole('searchbox', { name: 'Name' }).fill('smith j')
  await expect(page).toHaveURL(/q=smith/)
  const first = page.getByRole('table').getByRole('link').first()
  const name = await first.textContent()
  expect(name).toMatch(/smith.* j/i)
  await first.click()
  await expect(page).toHaveURL(/\/people\/[^?]+\?year=2025$/)
  await page.reload()
  await expect(
    page.getByRole('heading', { level: 1, name: name ?? '' }),
  ).toBeVisible()
  await expect(
    page.getByRole('rowheader', { name: 'Annual salary rate' }).first(),
  ).toBeVisible()
  await expect(
    page
      .getByRole('link', { name: /^Fall \d{4} Census salary reports$/ })
      .first(),
  ).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex',
  )
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/people\?q=smith/)
  await page.goto(`/people?name=${encodeURIComponent(name ?? '')}&year=2099`)
  await expect(page).toHaveURL(/\/people\/[^?]+\?year=2099$/)
  await expect(
    page.getByRole('heading', { level: 1, name: name ?? '' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Back to people' }).click()
  await expect(page).toHaveURL(/\/people$/)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
})

async function openLinkedPerson(page: Page) {
  await page.goto('/people?q=smith+benjamin+j&year=2023')
  await page.getByRole('table').getByRole('link').first().click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
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
  await expect(
    page.getByRole('link', {
      name: /^Fall \d{4}-\d{4} Census salary reports$/,
    }),
  ).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

test('census tabs are held in the link and lead to the class’s jobs, and the search view cites its sources', async ({
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
  const people = page.getByRole('link', {
    name: /^People, .+, Fall 2021$/,
  })
  await expect(people.first()).toBeVisible()
  await people.last().click()
  await expect(page).toHaveURL(/\/people\?.*position=/)
  await expect(page.getByRole('main')).toContainText('Class or rank: ')
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page).not.toHaveURL(/position=/)
  await page.goto('/people?q=smith')
  await expect(
    page.getByRole('link', { name: 'Fall 2025 Census salary reports' }),
  ).toBeVisible()
  await page.goto('/people?q=zzzz')
  await expect(page.getByRole('main')).toContainText('No name matches “zzzz”.')
  await page.goto('/people?q=smith+benjamin+j')
  await page
    .getByRole('list', { name: 'Matching names' })
    .getByRole('link')
    .first()
    .click()
  await expect(page).toHaveURL(/\/people\/[^?]+$/)
})

test('the people list filters, sorts, and pages one census, and its chart sets the rate range', async ({
  page,
}) => {
  await page.goto('/people')
  const main = page.getByRole('main')
  await expect(main).toContainText('6,840 jobs, 6,268 names match')
  await expect(main.getByText('Page 1 of 137')).toBeVisible()
  await page.getByRole('link', { name: 'Next' }).click()
  await expect(page).toHaveURL(/page=2/)
  await page.getByRole('spinbutton', { name: 'Rate from ($)' }).fill('250000')
  await expect(page).toHaveURL(/min=250000/)
  await expect(page).not.toHaveURL(/page=/)
  await expect(main).toContainText('129 jobs, 124 names match')
  const rate = page.getByRole('button', { name: 'Annual salary rate' })
  await rate.click()
  await rate.click()
  await expect(page).toHaveURL(/sort=rate&dir=desc/)
  await expect(
    page.getByRole('columnheader', { name: /Annual salary rate/ }),
  ).toHaveAttribute('aria-sort', 'descending')
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('group')
  await expect(page).toHaveURL(/sort=group&dir=desc/)
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page).not.toHaveURL(/min=/)
  await page.getByText('The chart’s numbers').click()
  await page.getByRole('button', { name: '$50,000 to $59,999' }).click()
  await expect(page).toHaveURL(/min=50000&max=59999/)
  await expect(main).toContainText('Rate to $59,999')
  await expect(
    page.getByRole('columnheader', { name: 'EEO category' }),
  ).toHaveCount(0)
  await page.getByText('Columns', { exact: true }).click()
  await page.getByRole('checkbox', { name: 'EEO category' }).check()
  await expect(page).toHaveURL(/cols=/)
  await expect(
    page.getByRole('columnheader', { name: 'EEO category' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'By group' }).click()
  await expect(page).toHaveURL(/chart=groups/)
  await expect(
    page.getByRole('columnheader', { name: 'Median rate, primary jobs' }),
  ).toBeVisible()
})

test('the people list does not scroll sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/people?dept=223100')
  await expect(page.getByRole('table').first()).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

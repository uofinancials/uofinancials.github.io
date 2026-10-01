/// <reference lib="dom" />
import { expect, type Page, test } from '@playwright/test'
import { collectDataFiles, openSources } from './sources.ts'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/^UO Financials \| An independent look/)
})

for (const path of [
  '/',
  '/trends',
  '/trends/pay-changes',
  '/departments',
  '/departments/223100',
  '/people',
  '/people/No such name',
  '/budget',
  '/scenarios',
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

test('the nav lists the sections in order and marks the current one apart from the others', async ({
  page,
}) => {
  await page.goto('/departments/223100')
  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav.getByRole('link')).toHaveText([
    'Budget',
    'Scenarios',
    'Trends',
    'Departments',
    'People',
    'Sources',
  ])
  const current = nav.getByRole('link', { name: 'Departments' })
  const other = nav.getByRole('link', { name: 'Trends' })
  await expect(current).toHaveAttribute('aria-current', 'page')
  await expect(other).not.toHaveAttribute('aria-current')
  const styleOf = (link: typeof current) =>
    link.evaluate((element) => {
      const { color, textDecorationLine } = getComputedStyle(element)
      return { color, textDecorationLine }
    })
  const [currentStyle, otherStyle] = await Promise.all([
    styleOf(current),
    styleOf(other),
  ])
  expect(currentStyle.color).not.toBe(otherStyle.color)
  expect(currentStyle.textDecorationLine).not.toBe(
    otherStyle.textDecorationLine,
  )
})

test('on a phone the nav links sit on one row under the site name, with the current page’s link in view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/sources')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const links = page.getByRole('navigation', { name: 'Main' }).getByRole('link')
  const tops = await links.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().top),
  )
  expect(new Set(tops).size).toBe(1)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360)
  const sources = links.filter({ hasText: 'Sources' })
  await expect(sources).toBeInViewport({ ratio: 1 })
  await page.goto('/')
  await expect(sources).not.toBeInViewport()
  await page
    .getByRole('link', { name: 'Every source and when it was retrieved' })
    .click()
  await expect(page).toHaveURL(/\/sources$/)
  await expect(sources).toBeInViewport({ ratio: 1 })
})

for (const path of ['/', '/budget', '/scenarios']) {
  test(`on a phone the chart marker’s label on ${path} stays inside the plot`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(path)
    const label = page.locator('.recharts-label', { hasText: 'below zero' })
    await expect(label).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const plot = await page
      .locator('figure', { has: label })
      .locator('.recharts-cartesian-grid')
      .boundingBox()
    const text = await label.boundingBox()
    if (!plot || !text) throw new Error('the chart has no plot or no label')
    expect(text.x).toBeGreaterThanOrEqual(plot.x)
    expect(text.x + text.width).toBeLessThanOrEqual(plot.x + plot.width)
  })
}

test('the first tab stop skips to the page content', async ({ page }) => {
  await page.goto('/sources')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
})

test('each page names itself in the browser tab', async ({ page }) => {
  await page.goto('/sources')
  await expect(page).toHaveTitle('Sources | UO Financials')
  await page.goto('/departments/223100')
  await expect(page).toHaveTitle(/ 223100 \| UO Financials$/)
  await page.getByRole('link', { name: 'UO Financials', exact: true }).click()
  await expect(page).toHaveTitle(/^UO Financials \| An independent look/)
})

test('an unknown path shows the not-found page', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(
    page.getByRole('heading', { name: 'Page not found' }),
  ).toBeVisible()
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
  for (let year = 2021; year <= 2026; year++) {
    await expect(page.locator(`#fy-${year}`)).toContainText(
      `FY${year - 1}-${String(year).slice(2)}`,
    )
  }
  await expect(page.locator('#rates')).toContainText('Blended-OPE-Rate-History')
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
  await expect(main).toContainText('$72,797')
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
  await expect(page).toHaveURL(/year=2014/)
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
  await page
    .getByRole('link', { name: 'Jobs and salary distribution, Fall 2020' })
    .click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'People, Fall 2020' }),
  ).toBeVisible()
  const main = page.getByRole('main')
  await expect(main).toContainText('Department: CAS Biology (223100)')
  await page
    .getByRole('button', { name: 'Remove Department: CAS Biology (223100)' })
    .click()
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
  await openSources(page)
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
    'Computed by this site from the records below, not published by UO. From Fall 2021-2023, years linked on the name, or on names this site joins as one person, and the same pay department of a single primary job, codes this site joins to one unit counting as one.',
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
  await openSources(page)
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
  await page.getByRole('button', { name: /^Remove Class or rank: / }).click()
  await expect(page).not.toHaveURL(/position=/)
  await page.goto('/people?q=smith')
  await openSources(page)
  await expect(
    page.getByRole('link', { name: 'Fall 2025 Census salary reports' }),
  ).toHaveCount(2)
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
  await page.getByRole('button', { name: 'Remove Rate from $250,000' }).click()
  await expect(page).not.toHaveURL(/min=/)
  await page.getByText('The chart’s numbers').click()
  await page.getByRole('button', { name: '$50,000 to $59,999' }).click()
  await expect(page).toHaveURL(/min=50000&max=59999/)
  await expect(main).toContainText('Rate to $59,999')
  const categoryHeader = page
    .getByRole('table', { name: 'Fall 2025 jobs' })
    .getByRole('columnheader', { name: 'EEO category' })
  await expect(categoryHeader).toHaveCount(0)
  await page.getByText('Columns', { exact: true }).click()
  await page.getByRole('checkbox', { name: 'EEO category' }).check()
  await expect(page).toHaveURL(/cols=/)
  await expect(categoryHeader).toBeVisible()
  await page.getByRole('link', { name: 'By group' }).click()
  await expect(page).toHaveURL(/chart=groups/)
  await expect(
    page.getByRole('columnheader', { name: 'Median rate, primary jobs' }),
  ).toBeVisible()
})

test('the people list does not scroll sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/people?dept=223100')
  await expect(
    page.getByRole('table', { name: 'Fall 2025 jobs' }),
  ).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

test('on a phone the people filters fold behind a button while their chips stay in view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/people?group=Faculty&q=smith')
  const name = page.getByRole('searchbox', {
    name: 'Name',
    includeHidden: true,
  })
  await expect(name).toHaveCount(1)
  await expect(name).toBeHidden()
  await expect(
    page.getByRole('button', { name: 'Remove Group: Faculty' }),
  ).toBeVisible()
  const toggle = page.getByRole('button', { name: /Fall 2025 · 2 filters/ })
  await toggle.click()
  await expect(name).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
})

test('on a phone a people year change keeps the filter panel open and the focus in it while the census loads', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/people')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'People, Fall 2025',
  )
  await page.route('**/data/fall/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500))
    await route.continue()
  })
  const toggle = page.getByRole('button', { name: /^Fall 2025 · / })
  await toggle.click()
  const year = page.getByRole('combobox', { name: 'Fall census' })
  await year.focus()
  await year.selectOption('2014')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'People, Fall 2014',
  )
  await expect(year).toBeFocused()
  await expect(
    page.getByRole('button', { name: /^Fall 2014 · / }),
  ).toHaveAttribute('aria-expanded', 'true')
})

test('clearing all people filters keeps the census year, sort, and columns', async ({
  page,
}) => {
  await page.goto(
    '/people?year=2020&q=smith&group=Faculty&min=50000&sort=rate&dir=desc&cols=%5B%22title%22%5D',
  )
  const chips = page.getByRole('list', { name: 'Active filters' })
  await expect(chips.getByRole('listitem')).toHaveCount(4)
  await chips.getByRole('button', { name: 'Clear all' }).click()
  await expect(chips).toHaveCount(0)
  const url = new URL(page.url())
  expect([...url.searchParams.keys()].sort()).toEqual([
    'cols',
    'dir',
    'sort',
    'year',
  ])
})

test('the people list cites its census before the EEO section begins', async ({
  page,
}) => {
  await page.goto('/people')
  const eeo = page.locator('section', {
    has: page.getByRole('heading', {
      level: 2,
      name: 'Salary spend by EEO category',
    }),
  })
  await expect(eeo).toBeVisible()
  await expect(
    eeo.locator('xpath=preceding-sibling::*[1]').locator('summary'),
  ).toHaveText(/^Sources? and method/)
  await expect(eeo.locator('xpath=following-sibling::details')).toHaveCount(0)
})

test('a person page loads the bucket its name is filed in and the medians, and no census', async ({
  page,
}) => {
  const dataFiles = collectDataFiles(page)
  await page.goto(`/people/${encodeURIComponent('Turner, Matthew W')}`)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Turner, Matthew W' }),
  ).toBeVisible()
  await openSources(page)
  await page.waitForLoadState('networkidle')
  expect([...dataFiles].sort()).toEqual([
    'manifest.json',
    expect.stringMatching(/^people\/buckets\/[0-9a-f]{2}\.json$/),
    'people/medians.json',
  ])
})

test('an earlier name leads to the person under their latest name, whose history shows each name as published', async ({
  page,
}) => {
  await page.goto(`/people/${encodeURIComponent('Turner, Mathew W')}?year=2020`)
  await expect(page).toHaveURL(/\/people\/Turner[^?]*Matthew[^?]*\?year=2020$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Turner, Matthew W' }),
  ).toBeVisible()
  await expect(page.getByRole('main')).toContainText(
    'Also published as Turner, Mathew W.',
  )
  await expect(
    page.getByRole('columnheader', { name: 'Name as published' }),
  ).toBeVisible()
})

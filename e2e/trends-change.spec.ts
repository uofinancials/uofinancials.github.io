/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { openSources } from './sources.ts'

test('pay changes show each census pair’s median by group, the change counts, and one pair’s distribution held in the link', async ({
  page,
}) => {
  await page.goto('/trends?tab=raises')
  const main = page.getByRole('main')
  await page.getByRole('link', { name: /^Pay changes by department/ }).click()
  await expect(page).toHaveURL(/\/trends\/pay-changes$/)
  const lines = page.getByRole('table', {
    name: /^Median change in salary rate/,
  })
  await expect(
    lines.getByRole('row', { name: /^2024-25 \+7\.9%/ }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('table', { name: /changed class, rank, or title/ })
      .getByRole('row', { name: /^2024-25 5,203 / }),
  ).toContainText('171 (')
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
  await openSources(page)
  await expect(
    page
      .getByRole('link', { name: 'Fall 2014-2025 Census salary reports' })
      .first(),
  ).toBeVisible()
  await page.goto('/trends/pay-changes?dept=000000')
  await expect(main).toContainText('Pay department: 000000')
  await expect(main).toContainText('0 continuing jobs match')
  await page.goto('/trends/pay-changes?from=2025')
  await expect(main).toContainText('A change needs two consecutive censuses')
  await expect(page.getByRole('group', { name: 'Lines' })).toHaveCount(0)
})

test('an old change measure link redirects to pay changes, and an opened group’s change lines are its categories', async ({
  page,
}) => {
  await page.goto('/trends?metric=change&group=Admins+and+professionals')
  await expect(page).toHaveURL(
    /\/trends\/pay-changes\?group=Admins\+and\+professionals$/,
  )
  await expect(
    page.getByRole('columnheader', { name: 'Senior Administrators' }),
  ).toBeVisible()
})

test('a person links to the pay changes of their class or rank, the filter can be removed, and the page does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/people?q=smith+benjamin+j&year=2023')
  await page.getByRole('table').getByRole('link').first().click()
  await page
    .getByRole('link', { name: /^Pay changes, / })
    .last()
    .click()
  await expect(page).toHaveURL(/\/trends\/pay-changes\?.*position=/)
  const main = page.getByRole('main')
  await expect(main).toContainText('Class or rank: ')
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
  await page.getByRole('button', { name: /^Remove Class or rank: / }).click()
  await expect(page).not.toHaveURL(/position=/)
})

test('pay changes set each raise group’s median beside its cited across-the-board increase', async ({
  page,
}) => {
  await page.goto('/trends/pay-changes?pair=2024')
  const table = page.getByRole('table', {
    name: 'Across-the-board and other increases, Fall 2024-25 (estimated)',
  })
  await expect(
    table.getByRole('row', {
      name: /^SEIU 503 1,517 \+10\.8% \+6\.6% \+4\.2 points/,
    }),
  ).toBeVisible()
  await expect(
    table.getByRole('row', {
      name: /^United Academics, tenure-related 758 \+7\.9% \+7\.9% 0\.0 points/,
    }),
  ).toBeVisible()
  await expect(page.getByRole('main')).toContainText(
    '452 continuing jobs are in no raise group',
  )
  await expect(
    page
      .getByRole('table', { name: 'Across-the-board terms used' })
      .getByRole('link', { name: /SEIU/ })
      .first(),
  ).toHaveAttribute('href', /^https:\/\//)
  await page.goto('/trends/pay-changes?pair=2024&group=Faculty')
  await expect(page.getByRole('main')).toContainText(
    'leaves out the opened group',
  )
})

test('changing a filter far down the page keeps the reader where they are', async ({
  page,
}) => {
  await page.goto('/trends/pay-changes')
  const pair = page.getByRole('combobox', { name: 'Fall' })
  await pair.scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await pair.selectOption('2021')
  await expect(page).toHaveURL(/pair=2021/)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

test('the renames and abbreviations close with their source and method', async ({
  page,
}) => {
  await page.goto('/trends/pay-changes')
  const section = page.locator('section', {
    has: page.getByRole('heading', {
      level: 2,
      name: 'Renames and abbreviations',
    }),
  })
  await expect(section.locator('details > summary')).toHaveText(
    /^Sources? and method/,
  )
})

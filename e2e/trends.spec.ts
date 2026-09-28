/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { openSources } from './sources.ts'

test('the report answers each question from the Fall censuses, with the exact figures and their sources', async ({
  page,
}) => {
  await page.goto('/trends')
  const main = page.getByRole('main')
  await expect(
    page.getByRole('heading', { level: 1, name: /since Fall 2014$/ }),
  ).toBeVisible()
  await expect(main).toContainText('$504,812,068, from $295,679,251')
  await expect(main).toContainText('+14.8 per 100')
  await expect(
    page.getByRole('list', {
      name: 'Change in jobs by group, Fall 2014 to Fall 2025',
    }),
  ).toContainText('Admins and professionals+27.0%')
  await expect(main).toContainText(
    'Jobs since Fall 2014: +11.9% for all jobs. Admins and professionals changed most, +27.0%, and Faculty least, +0.4%.',
  )
  await expect(
    page.getByRole('table', { name: /^Change by group/ }).getByRole('row', {
      name: 'Admins and professionals +27.0% +93.8% +30.4% +30.2%',
    }),
  ).toBeVisible()
  await expect(main).toContainText(
    'Salary spend rose $209,132,817 from Fall 2014 to Fall 2025. Admins and professionals took 40.1% of the rise.',
  )
  await expect(
    page
      .getByRole('table', { name: /^Change in salary spend by group/ })
      .getByRole('row', {
        name: 'Admins and professionals +$83,953,143 40.1%',
      }),
  ).toBeVisible()
  await expect(main).toContainText(
    '$43,791,749 is the change in FTE at Fall 2014 spend per FTE and $165,341,068 is the rest.',
  )
  const raises = page.getByRole('table', {
    name: /^Median change in salary rate/,
  })
  await expect(
    raises.getByRole('row', {
      name: /^All continuing jobs 0\.0% \+2\.2% .* \+7\.9% \+40\.8%$/,
    }),
  ).toBeVisible()
  await openSources(page)
  await expect(
    page
      .getByRole('link', { name: 'Fall 2014-2025 Census salary reports' })
      .first(),
  ).toBeVisible()
})

test('the measure and years are held in the link, and every section compares against From', async ({
  page,
}) => {
  await page.goto('/trends')
  await page
    .locator('#groups-grew')
    .getByRole('radio', { name: 'Median salary rate' })
    .check()
  await expect(page).toHaveURL(/growth=median/)
  await page
    .locator('#compare')
    .getByRole('radio', { name: 'Salary spend' })
    .check()
  await expect(page).toHaveURL(/compare=spend/)
  await page.getByRole('combobox', { name: 'From' }).selectOption('2018')
  await expect(page).toHaveURL(/from=2018/)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'What changed since Fall 2018' }),
  ).toBeVisible()
  const growth = page.locator('#groups-grew')
  await expect(
    growth.getByRole('list', {
      name: 'Change in median salary rate by group, Fall 2018 to Fall 2025',
    }),
  ).toBeVisible()
  await growth.getByRole('radio', { name: 'Over time' }).check()
  await expect(page).toHaveURL(/view=chart/)
  await expect(
    page.getByRole('figure', {
      name: 'Median salary rate by group, Fall 2018 = 100',
    }),
  ).toBeVisible()
  const raises = page.getByRole('table', {
    name: /^Median change in salary rate/,
  })
  await expect(
    raises.getByRole('columnheader', { name: '2018-19' }),
  ).toBeVisible()
  await expect(
    raises.getByRole('columnheader', { name: '2017-18' }),
  ).toHaveCount(0)
})

test('a link made before the report keeps only what the report reads', async ({
  page,
}) => {
  await page.goto('/trends?dept=000000&from=2018')
  await expect(page).toHaveURL(/\/trends\?from=2018$/)
  await page.goto('/trends?position=D9101&group=Executives&metric=fte')
  await expect(page).toHaveURL(/\/trends$/)
})

test('on a phone the growth chart is ranked bars, the question links open and jump to their sections, and the page does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/trends')
  await page
    .getByRole('navigation', { name: 'Questions on this page' })
    .getByRole('link', { name: 'Where did the money go?' })
    .click()
  await expect(page).toHaveURL(/#money$/)
  await expect(
    page.getByRole('heading', { name: 'Where did the money go?' }),
  ).toBeInViewport()
  await expect(
    page.getByRole('list', { name: /^Change in jobs by group/ }),
  ).toContainText('Admins and professionals+27.0%')
  const raises = page.getByRole('table', {
    name: /^Median change in salary rate/,
  })
  await expect(raises).toBeHidden()
  await page
    .getByRole('navigation', { name: 'Questions on this page' })
    .getByRole('link', { name: 'What raises did people get?' })
    .click()
  await expect(raises).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

test('a unit is charted against its area and the university, held in the link', async ({
  page,
}) => {
  await page.goto('/trends')
  const section = page.locator('#compare')
  await expect(
    section.getByRole('row', {
      name: /^Arts & Sciences, College of [\d,]+ -4\.1% \+40\.\d%$/,
    }),
  ).toBeVisible()
  await section
    .getByRole('combobox', { name: 'College or VP area' })
    .selectOption({ label: 'Arts & Sciences, College of' })
  await expect(page).toHaveURL(/area=.*222000/)
  await section
    .getByRole('combobox', { name: 'Unit' })
    .selectOption({ label: 'CAS English' })
  await expect(page).toHaveURL(/unit=.*222050/)
  await page.reload()
  await expect(section).toContainText(
    'CAS English: FTE -28.8% since Fall 2014, against -4.1% for Arts & Sciences, College of and +16.1% for All of UO.',
  )
  await expect(
    section.getByRole('row', { name: 'CAS English 72 -28.8% +7.6%' }),
  ).toBeVisible()
  await expect(
    section.getByRole('link', { name: 'CAS English' }),
  ).toHaveAttribute('href', '/departments/222050')
})

test('an old area link opens the comparison on that area', async ({ page }) => {
  await page.goto('/trends?area=222000&metric=fte')
  await expect(page).toHaveURL(/\/trends\?area=.*222000.*$/)
  await expect(page).not.toHaveURL(/metric/)
  await expect(
    page.getByRole('combobox', { name: 'College or VP area' }),
  ).toHaveValue('222000')
})

/// <reference lib="dom" />
import { expect, type Page, test } from '@playwright/test'
import { openSources } from './sources.ts'

function tab(page: Page, name: string) {
  return page
    .getByRole('navigation', { name: 'Questions' })
    .getByRole('link', { name })
}

test('the report answers each question in its tab, with the exact figures and their sources', async ({
  page,
}) => {
  await page.goto('/trends')
  const main = page.getByRole('main')
  await expect(
    page.getByRole('heading', { level: 1, name: /since Fall 2014$/ }),
  ).toBeVisible()
  await expect(main).toContainText('$504,812,068, from $295,679,251')
  await expect(main).toContainText('+14.8 per 100')
  await expect(tab(page, 'Which groups grew?')).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(main).toContainText(
    'Jobs since Fall 2014: +11.9% for all jobs. Admins and professionals changed most, +27.0%, and Faculty least, +0.4%.',
  )
  await expect(
    page.getByRole('list', {
      name: 'Change in jobs by group, Fall 2014 to Fall 2025',
    }),
  ).toContainText('Admins and professionals+27.0%')
  await expect(
    page.getByRole('table', { name: /^Change by group/ }).getByRole('row', {
      name: 'Admins and professionals +27.0% +93.8% +30.4% +30.2%',
    }),
  ).toBeVisible()
  await tab(page, 'Where did the money go?').click()
  await expect(page).toHaveURL(/tab=money/)
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
  await tab(page, 'More people, or higher pay?').click()
  await expect(main).toContainText(
    '$43,791,749 is the change in FTE at Fall 2014 spend per FTE and $165,341,068 is the rest.',
  )
  await tab(page, 'What raises did people get?').click()
  await expect(
    page
      .getByRole('table', { name: /^Median change in salary rate/ })
      .getByRole('row', {
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

test('the filters and the growth view are held in the link, and every tab compares against From', async ({
  page,
}) => {
  await page.goto('/trends')
  await page.getByRole('radio', { name: 'Median salary rate' }).check()
  await expect(page).toHaveURL(/measure=median/)
  await page.getByRole('combobox', { name: 'From' }).selectOption('2018')
  await expect(page).toHaveURL(/from=2018/)
  await page.reload()
  await expect(
    page.getByRole('heading', {
      name: 'What changed in All of UO since Fall 2018',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('list', {
      name: 'Change in median salary rate by group, Fall 2018 to Fall 2025',
    }),
  ).toBeVisible()
  await page.getByRole('radio', { name: 'Over time' }).check()
  await expect(page).toHaveURL(/view=chart/)
  await expect(
    page.getByRole('figure', {
      name: 'Median salary rate by group, Fall 2018 = 100',
    }),
  ).toBeVisible()
  await tab(page, 'What raises did people get?').click()
  await expect(page.getByRole('group', { name: 'Measure' })).toHaveCount(0)
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

test('a college or VP area and a unit within it scope every tab, and the comparison sets the pick against its area and the university', async ({
  page,
}) => {
  await page.goto('/trends')
  await tab(page, 'How does it compare?').click()
  await expect(
    page.getByRole('row', {
      name: /^Arts & Sciences, College of [\d,]+ -4\.1% \+40\.\d%$/,
    }),
  ).toBeVisible()
  const areaBox = page.getByRole('combobox', { name: 'College or VP area' })
  await areaBox.fill('arts sci')
  await page
    .getByRole('listbox', { name: 'College or VP area' })
    .getByRole('option', { name: /^Arts & Sciences, College of/ })
    .click()
  await expect(page).toHaveURL(/area=.*222000/)
  await expect(areaBox).toHaveValue('Arts & Sciences, College of')
  await page.getByRole('radio', { name: 'FTE' }).check()
  await page
    .getByRole('combobox', { name: 'Unit' })
    .selectOption({ label: 'CAS English' })
  await expect(page).toHaveURL(/unit=.*222050/)
  await page.reload()
  const main = page.getByRole('main')
  await expect(
    page.getByRole('heading', {
      name: 'What changed in CAS English since Fall 2014',
    }),
  ).toBeVisible()
  await expect(main).toContainText(
    'CAS English: FTE -28.8% since Fall 2014, against -4.1% for Arts & Sciences, College of and +16.1% for All of UO.',
  )
  await expect(
    page.getByRole('row', { name: 'CAS English 72 -28.8% +7.6%' }),
  ).toBeVisible()
  await expect(
    main.getByRole('link', { name: 'CAS English', exact: true }),
  ).toHaveAttribute('href', '/departments/222050')
  await tab(page, 'What raises did people get?').click()
  await expect(
    page.getByRole('link', { name: /^Pay changes by department/ }),
  ).toHaveAttribute('href', /dept=.*222050/)
})

test('links made before the report keep what it reads, and an area link scopes it', async ({
  page,
}) => {
  await page.goto('/trends?dept=000000&from=2018')
  await expect(page).toHaveURL(/\/trends\?from=2018$/)
  await page.goto('/trends?position=D9101&group=Executives&metric=fte')
  await expect(page).toHaveURL(/\/trends$/)
  await page.goto('/trends?area=222000&metric=fte')
  await expect(page).not.toHaveURL(/metric/)
  await expect(
    page.getByRole('combobox', { name: 'College or VP area' }),
  ).toHaveValue('Arts & Sciences, College of')
  await page.getByRole('button', { name: 'Clear College or VP area' }).click()
  await expect(page).not.toHaveURL(/area=/)
  await expect(
    page.getByRole('heading', {
      name: 'What changed in All of UO since Fall 2014',
    }),
  ).toBeVisible()
  await page.goto('/trends?area=222000')
  await expect(
    page.getByRole('heading', {
      name: 'What changed in Arts & Sciences, College of since Fall 2014',
    }),
  ).toBeVisible()
})

test('the filters stay in view and a tab keeps the reader’s place', async ({
  page,
}) => {
  await page.goto('/trends')
  const tabs = page.getByRole('navigation', { name: 'Questions' })
  await tabs.scrollIntoViewIfNeeded()
  await page.mouse.wheel(0, 400)
  await expect(
    page.getByRole('combobox', { name: 'College or VP area' }),
  ).toBeInViewport()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await tab(page, 'Where did the money go?').click()
  await expect(page).toHaveURL(/tab=money/)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

test('on a phone the filters fold behind one button, the growth tab is ranked bars, and the page does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/trends')
  const area = page.getByRole('combobox', { name: 'College or VP area' })
  await expect(area).toBeHidden()
  await page.getByRole('button', { name: /Filters$/ }).click()
  await expect(area).toBeVisible()
  await expect(
    page.getByRole('list', { name: /^Change in jobs by group/ }),
  ).toContainText('Admins and professionals+27.0%')
  await tab(page, 'What raises did people get?').click()
  await expect(
    page.getByRole('table', { name: /^Median change in salary rate/ }),
  ).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

test('areas and units from anywhere can be added to the comparison by typing, and are held in the link', async ({
  page,
}) => {
  await page.goto('/trends?tab=compare&measure=fte')
  const search = page.getByRole('combobox', { name: 'Compare with' })
  const suggestions = page.getByRole('listbox', { name: 'Compare with' })
  await search.fill('athlet')
  await expect(
    suggestions.getByRole('option', { name: /^Athletics/ }),
  ).toBeVisible()
  await search.press('Enter')
  await expect(page).toHaveURL(/with=.*480000/)
  await search.fill('romance')
  await suggestions
    .getByRole('option', { name: /^CAS Romance Languages/ })
    .click()
  await expect(page).toHaveURL(/with=.*480000.*222100/)
  await page.reload()
  await expect(page.getByRole('main')).toContainText(
    'Athletics: FTE +42.5% since Fall 2014, against -47.2% for CAS Romance Languages and +16.1% for All of UO.',
  )
  await expect(
    page.getByRole('figure', { name: 'FTE, Fall 2014 = 100' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Remove Athletics' }).click()
  await expect(page).not.toHaveURL(/480000/)
  await expect(page.getByRole('main')).toContainText(
    'CAS Romance Languages: FTE -47.2% since Fall 2014, against +16.1% for All of UO.',
  )
})

test('a picked unit is compared with its area by default, and the area can be removed', async ({
  page,
}) => {
  await page.goto('/trends?tab=compare&area=222000&unit=222050&measure=fte')
  await expect(page.getByRole('main')).toContainText(
    'CAS English: FTE -28.8% since Fall 2014, against -4.1% for Arts & Sciences, College of and +16.1% for All of UO.',
  )
  await page
    .getByRole('button', { name: 'Remove Arts & Sciences, College of' })
    .click()
  await expect(page).toHaveURL(/with=/)
  await expect(page.getByRole('main')).toContainText(
    'CAS English: FTE -28.8% since Fall 2014, against +16.1% for All of UO.',
  )
})

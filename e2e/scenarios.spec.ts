/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

test('an example loads its rules into the link and shows what they save', async ({
  page,
}) => {
  await page.goto('/scenarios')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Scenarios' }),
  ).toBeVisible()
  await expect(page.getByRole('main')).toContainText(
    'not a recommendation about any person',
  )
  await page
    .getByRole('link', { name: 'What would 10% off pay above $200,000 save?' })
    .click()
  await expect(page).toHaveURL(/rules=/)
  const rule = page.getByRole('row', { name: /^1\. 10% off pay above/ })
  await expect(rule.getByRole('cell')).toHaveText([
    '263',
    '$3,900,024',
    '$5,317,553',
    '$1,387,199',
  ])
  await expect(
    page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Scenarios' }),
  ).toHaveAttribute('aria-current', 'page')
})

test('the page does not scroll sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/scenarios')
  await page
    .getByRole('link', { name: /^With a one-year hiring freeze and 5% off/ })
    .click()
  await expect(page.getByText('turnover a year')).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

test('a freeze loads the past censuses and is counted year by year against a chosen case', async ({
  page,
}) => {
  await page.goto('/scenarios')
  await page
    .getByRole('link', { name: /^With a one-year hiring freeze and 5% off/ })
    .click()
  await expect(
    page.getByRole('rowheader', { name: /^1\. A 1-year hiring freeze/ }),
  ).toContainText('turnover a year')
  const outlook = page.getByRole('table', { name: /savings by fiscal year/ })
  await expect(outlook.getByRole('row', { name: /^FY27/ })).toContainText(
    '$24,653,062',
  )
  await expect(outlook.getByRole('row', { name: /^FY30/ })).toContainText(
    '-1.0',
  )
  await expect(page.getByRole('main')).toContainText(
    'first falls below zero in FY30',
  )
  await page.getByLabel('Set against').selectOption({
    label: 'State funding $20 million below projection from FY28',
  })
  await expect(page).toHaveURL(/case=.*State/)
  await expect(outlook.getByRole('row', { name: /^FY31/ })).toContainText(
    '-$173,156,103',
  )
  await expect(page.getByRole('main')).toContainText(
    'Weeks of expenses are not computed for this case',
  )
})

test('a rule the link cannot read is left out and counted', async ({
  page,
}) => {
  await page.goto(
    `/scenarios?rules=${encodeURIComponent(JSON.stringify(['remove', { kind: 'cut', cutPercent: 5 }]))}`,
  )
  await expect(page.getByRole('status')).toHaveText(
    '1 rule in the link could not be read and was left out.',
  )
  await expect(page.getByRole('row', { name: /^1\. 5% off pay/ })).toBeVisible()
})

test('rules are added, edited, moved, and removed in place, and held in the link', async ({
  page,
}) => {
  await page.goto('/scenarios')
  await page.getByRole('button', { name: 'Cut pay above a threshold' }).click()
  const threshold = page.getByRole('group', { name: /^1\./ })
  await threshold.getByRole('textbox', { name: 'Pay above ($)' }).fill('250000')
  await threshold.getByRole('textbox', { name: 'Cut (%)' }).fill('100')
  await expect(
    page
      .getByRole('row', { name: /^1\. Pay capped at \$250,000/ })
      .getByRole('cell'),
  ).toHaveText(['127', '$31,183,426', '$41,861,840', '$6,847,684'])
  await page.getByRole('button', { name: 'Hiring freeze' }).click()
  await page
    .getByRole('group', { name: /^2\./ })
    .getByRole('combobox', { name: /^Staff/ })
    .selectOption('classified')
  await expect(
    page.getByRole('rowheader', { name: /^2\. A 1-year hiring freeze/ }),
  ).toContainText('at 10.33% turnover a year')
  await page.getByRole('button', { name: 'Move rule 2 up' }).click()
  await expect(page.getByRole('group', { name: /^1\./ })).toHaveAccessibleName(
    /hiring freeze/,
  )
  await page.reload()
  await expect(page.getByRole('group', { name: /^2\./ })).toHaveAccessibleName(
    /Pay capped/,
  )
  await page.getByRole('button', { name: 'Remove rule 1' }).click()
  await expect(page.getByRole('group')).toHaveCount(1)
  await expect(page.getByRole('group', { name: /^1\./ })).toHaveAccessibleName(
    /Pay capped/,
  )
})

test('an elimination saves a unit’s FY27 E&G lines, notes a partial census match, and is held in the link', async ({
  page,
}) => {
  await page.goto('/scenarios')
  await page
    .getByRole('button', { name: 'Eliminate a department or area' })
    .click()
  await page
    .getByRole('group', { name: /^1\. Eliminated/ })
    .getByRole('combobox', { name: 'Department or area' })
    .selectOption({ label: 'CAS Mathematics (223501)' })
  const row = page.getByRole('row', { name: /^1\. CAS Mathematics \(223501\)/ })
  await expect(row.getByRole('cell')).toHaveText([
    '0',
    '$7,054,153',
    '$4,512,969',
    '$139,436',
    '$11,706,558',
    '$11,826,279',
  ])
  await expect(row).toContainText('under other codes')
  await expect(page.getByRole('main')).toContainText(
    'FY27 budget as of posting period 2',
  )
  await page.reload()
  await expect(
    page.getByRole('row', { name: /^1\. CAS Mathematics/ }),
  ).toBeVisible()
  const outlook = page.getByRole('table', { name: /savings by fiscal year/ })
  await expect(outlook.getByRole('row', { name: /^FY27/ })).toContainText(
    '$11,706,558',
  )
})

test('an elimination naming a code the budget does not list is left out and counted', async ({
  page,
}) => {
  await page.goto(
    `/scenarios?rules=${encodeURIComponent(JSON.stringify([{ kind: 'eliminate', code: '999999' }]))}`,
  )
  await expect(page.getByRole('status')).toHaveText(
    '1 rule in the link could not be read and was left out.',
  )
})

test('the page with an elimination does not scroll sideways at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/scenarios')
  await page
    .getByRole('button', { name: 'Eliminate a department or area' })
    .click()
  await page
    .getByRole('combobox', { name: 'Department or area' })
    .selectOption({ label: 'All of Arts & Sciences, College of' })
  await expect(
    page.getByRole('row', { name: /^1\. All of Arts & Sciences/ }),
  ).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(360)
})

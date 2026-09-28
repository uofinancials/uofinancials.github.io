import { expect, type Page } from '@playwright/test'

/** Opens every closed sources disclosure on the page, so its links can be asserted. */
export async function openSources(page: Page) {
  const closed = page.locator('details:not([open]) > summary', {
    hasText: /^Sources?\b/,
  })
  await expect(closed.first()).toBeVisible()
  while ((await closed.count()) > 0) {
    await closed.first().click()
  }
}

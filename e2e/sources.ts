import { expect, type Page } from '@playwright/test'

/** Opens every closed sources disclosure on the page. */
export async function openSources(page: Page) {
  const closed = page.locator('details:not([open]) > summary', {
    hasText: /^Sources?\b/,
  })
  await expect(closed.first()).toBeVisible()
  while ((await closed.count()) > 0) {
    await closed.first().click()
  }
}

/** The data files the page requests from here on, by their path under the data directory. */
export function collectDataFiles(page: Page): Set<string> {
  const dataFiles = new Set<string>()
  page.on('request', (request) => {
    const [, file] = new URL(request.url()).pathname.split('/data/')
    if (file) dataFiles.add(file)
  })
  return dataFiles
}

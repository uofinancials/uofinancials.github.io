import { readdirSync, readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const FY_DATA_DIR = 'public/data/fy'

test('the build serves the app as 404.html for clean paths on Pages', () => {
  expect(readFileSync('dist/404.html', 'utf8')).toBe(
    readFileSync('dist/index.html', 'utf8'),
  )
})

test('the build serves no fiscal year’s job file', async ({ request }) => {
  const files = readdirSync(FY_DATA_DIR)
  expect(files).not.toEqual([])
  for (const file of files) {
    // The preview server answers a missing path with the app unless JSON is asked for.
    const response = await request.get(`data/fy/${file}`, {
      headers: { Accept: 'application/json' },
    })
    expect(response.status(), file).toBe(404)
  }
})

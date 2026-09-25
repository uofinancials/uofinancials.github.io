import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { FALL_SOURCE_DIR, hasFallSources } from './cache.ts'
import { groupIntoLines, lineText, readPdfPages } from './pdf-lines.ts'

const PDF_PARSE_TIMEOUT_MS = 60_000

test('groups items by y, orders by x, and joins touching items', () => {
  const lines = groupIntoLines([
    { x: 200, y: 700.5, end: 230, text: 'Active' },
    { x: 10, y: 700, end: 60, text: 'JOB STATUS' },
    { x: 10, y: 680, end: 20, text: 'S' },
    { x: 20.4, y: 680, end: 30, text: 'ID' },
  ])
  expect(lines.map(lineText)).toEqual(['JOB STATUS Active', 'SID'])
})

describe.skipIf(!hasFallSources)('real Fall PDF', () => {
  test(
    'keeps labels and values of a 2025 record on one line',
    async () => {
      const file = path.join(FALL_SOURCE_DIR, 'Unclassified 110125.pdf')
      const pages = await readPdfPages(new Uint8Array(await readFile(file)))
      const text = pages[1]?.lines.map(lineText) ?? []
      expect(text.slice(0, 4)).toEqual([
        'UNCLASSIFIED PERSONNEL LIST',
        'UNIVERSITY OF OREGON',
        expect.stringMatching(/^Employees on Record as of November 1, 2025/),
        expect.stringMatching(/^NOTE: An employee/),
      ])
      expect(text).toContain('Abbe, Erica L')
      expect(text).toContain(
        'ANNUAL SALARY RATE $64,272 EEO CATEGORY Other Professionals',
      )
    },
    PDF_PARSE_TIMEOUT_MS,
  )
})

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import { FY_SOURCE_DIR, hasFySources, listPdfs } from '../cache.ts'
import { countJobTypeLines } from '../pdf/test-lines.ts'
import { type FyFile, parseFyFile } from './file.ts'

const PARSE_ALL_TIMEOUT_MS = 300_000
const PAY_REPORT_NAME = /Total Pay[ _](\d{4})-(\d{2})\.pdf$/
const CENTURY = 2000

describe.skipIf(!hasFySources)('every downloaded FY PDF', () => {
  const parsed = new Map<string, FyFile | null>()

  beforeAll(async () => {
    for (const file of await listPdfs(FY_SOURCE_DIR)) {
      parsed.set(file, await parseFyFile(new Uint8Array(await readFile(file))))
    }
  }, PARSE_ALL_TIMEOUT_MS)

  test('reads each total pay report and skips each Employees on Record list', () => {
    for (const [file, fy] of parsed) {
      const name = path.basename(file)
      const [, , endYear] = PAY_REPORT_NAME.exec(name) ?? []
      if (endYear === undefined) {
        expect(fy, name).toBeNull()
        continue
      }
      expect(fy?.kind, name).toBe(
        /^UNCLASSIFIED/i.test(name) ? 'unclassified' : 'classified',
      )
      expect(fy?.fiscalYear, name).toBe(CENTURY + Number(endYear))
    }
  })

  test('parses with no failures', () => {
    for (const [file, fy] of parsed) {
      expect(fy?.failures ?? [], path.basename(file)).toEqual([])
    }
  })

  test(
    'matches an independent count of records',
    async () => {
      for (const [file, fy] of parsed) {
        if (!fy) continue
        expect(fy.records.length, path.basename(file)).toBe(
          await countJobTypeLines(file),
        )
      }
    },
    PARSE_ALL_TIMEOUT_MS,
  )
})

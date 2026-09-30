import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { beforeAll, describe, expect, test } from 'vitest'
import { FALL_SOURCE_DIR, hasFallSources, listPdfs } from '../cache.ts'
import { type FallFile, parseFallFile } from './file.ts'

const PARSE_ALL_TIMEOUT_MS = 300_000
const PDFTOTEXT_MAX_BYTES = 64 * 1024 * 1024

const run = promisify(execFile)

async function countJobTypeLines(file: string): Promise<number> {
  const { stdout } = await run('pdftotext', ['-layout', file, '-'], {
    encoding: 'utf8',
    maxBuffer: PDFTOTEXT_MAX_BYTES,
  })
  return (
    stdout.match(/^JOB TYPE\s+(Primary|Secondary|Overload)\b/gm)?.length ?? 0
  )
}

describe.skipIf(!hasFallSources)('every downloaded Fall PDF', () => {
  const parsed = new Map<string, FallFile>()
  const independentCounts = new Map<string, number>()

  beforeAll(async () => {
    const files = await listPdfs(FALL_SOURCE_DIR)
    const counting = Promise.all(
      files.map(async (file) =>
        independentCounts.set(file, await countJobTypeLines(file)),
      ),
    )
    for (const file of files) {
      parsed.set(
        file,
        await parseFallFile(new Uint8Array(await readFile(file))),
      )
    }
    await counting
  }, PARSE_ALL_TIMEOUT_MS)

  test('identifies its kind and census date from its own header', () => {
    for (const [file, fall] of parsed) {
      const name = path.basename(file)
      const [, month, day, year] =
        /(\d{2})(\d{2})(\d{2})\.pdf$/i.exec(name) ?? []
      expect(fall.kind, name).toBe(
        name.startsWith('Unclassified') ? 'unclassified' : 'classified',
      )
      expect(fall.censusDate, name).toBe(`20${year}-${month}-${day}`)
    }
  })

  test('parses with no failures', () => {
    for (const [file, fall] of parsed) {
      expect(fall.failures, path.basename(file)).toEqual([])
    }
  })

  test('matches an independent count of records', () => {
    for (const [file, fall] of parsed) {
      expect(fall.records.length, path.basename(file)).toBe(
        independentCounts.get(file),
      )
    }
  })
})

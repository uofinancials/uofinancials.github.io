import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { PdfPage, TextLine } from './pdf-lines.ts'

const CHARACTER_WIDTH_PT = 5

export function line(
  y: number,
  ...cells: [x: number, text: string][]
): TextLine {
  return {
    y,
    items: cells.map(([x, text]) => ({
      x,
      end: x + text.length * CHARACTER_WIDTH_PT,
      text,
    })),
  }
}

export function page(pageNumber: number, ...lines: TextLine[]): PdfPage {
  return { pageNumber, lines }
}

const PDFTOTEXT_MAX_BYTES = 64 * 1024 * 1024
const run = promisify(execFile)

/** An independent count of a salary report's records: its JOB TYPE lines, as pdftotext lays them out. */
export async function countJobTypeLines(file: string): Promise<number> {
  const { stdout } = await run('pdftotext', ['-layout', file, '-'], {
    encoding: 'utf8',
    maxBuffer: PDFTOTEXT_MAX_BYTES,
  })
  return (
    stdout.match(/^JOB TYPE\s+(Primary|Secondary|Overload)\b/gm)?.length ?? 0
  )
}

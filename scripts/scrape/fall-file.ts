import type { FallRecord, StaffKind } from '../../src/data/fall.ts'
import {
  CENSUS_LINE,
  FOOTER_LINE,
  type PageFailure,
  readFallBlocks,
  TITLE_LINE,
} from './fall-blocks.ts'
import { isoDate, parseDate, toFallRecord } from './fall-record.ts'
import { lineText, type PdfPage, readPdfPages } from './pdf-lines.ts'

export type FallFile = {
  kind: StaffKind
  censusDate: string
  extractDate: string
  pages: number
  records: FallRecord[]
  failures: PageFailure[]
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export async function parseFallFile(bytes: Uint8Array): Promise<FallFile> {
  const pages = await readPdfPages(bytes)
  const { kind, censusDate, extractDate } = identifyFallFile(pages)
  const { blocks, failures } = readFallBlocks(pages)
  const records: FallRecord[] = []
  for (const block of blocks) {
    try {
      records.push(toFallRecord(block, kind))
    } catch (error) {
      failures.push({ page: block.page, message: String(error) })
    }
  }
  return {
    kind,
    censusDate,
    extractDate,
    pages: pages.length,
    records,
    failures,
  }
}

function identifyFallFile(pages: PdfPage[]): {
  kind: StaffKind
  censusDate: string
  extractDate: string
} {
  const text = pages[1]?.lines.map(lineText) ?? []
  const title = text.map((line) => TITLE_LINE.exec(line)).find(Boolean)
  const census = text.map((line) => CENSUS_LINE.exec(line)).find(Boolean)
  const footer = text.map((line) => FOOTER_LINE.exec(line)).find(Boolean)
  const month = MONTHS.indexOf(census?.[1] ?? '') + 1
  if (!title || !census || !footer || month === 0) {
    throw new Error(
      'not a Fall Census salary report: page 2 header or footer not recognised',
    )
  }
  return {
    kind: title[1] === 'CLASSIFIED' ? 'classified' : 'unclassified',
    censusDate: isoDate(census[3] ?? '', String(month), census[2] ?? ''),
    extractDate: parseDate(footer[1] ?? null) ?? '',
  }
}

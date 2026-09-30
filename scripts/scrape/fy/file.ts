import type { StaffKind } from '../../../src/data/fall.ts'
import type { FyRecord } from '../../../src/data/fy.ts'
import { type PageFailure, readBlocks, TITLE_LINE } from '../fall/blocks.ts'
import { lineText, type PdfPage, readPdfPages } from '../fall/pdf-lines.ts'
import { parseDate } from '../fall/record.ts'
import { FY_FOOTER, FY_HEADER, FY_LAYOUT, toFyRecord } from './record.ts'

const ON_RECORD_LINE = /^Employees on Record\b/

export type FyFile = {
  kind: StaffKind
  /** The year the fiscal year ends in. */
  fiscalYear: number
  extractDate: string
  pages: number
  records: FyRecord[]
  failures: PageFailure[]
}

/** A total pay report, or `null` for the June 30 "Employees on Record" lists kept beside them. */
export async function parseFyFile(bytes: Uint8Array): Promise<FyFile | null> {
  const pages = await readPdfPages(bytes)
  const identity = identifyFyFile(pages)
  if (!identity) return null
  const { blocks, failures } = readBlocks(pages, FY_LAYOUT)
  const records: FyRecord[] = []
  for (const block of blocks) {
    try {
      records.push(toFyRecord(block, identity.kind))
    } catch (error) {
      failures.push({ page: block.page, message: String(error) })
    }
  }
  return { ...identity, pages: pages.length, records, failures }
}

function identifyFyFile(
  pages: PdfPage[],
): Pick<FyFile, 'kind' | 'fiscalYear' | 'extractDate'> | null {
  const text = pages[1]?.lines.map(lineText) ?? []
  if (text.some((line) => ON_RECORD_LINE.test(line))) return null
  const title = text.map((line) => TITLE_LINE.exec(line)).find(Boolean)
  const header = text.map((line) => FY_HEADER.exec(line)).find(Boolean)
  const footer = text.map((line) => FY_FOOTER.exec(line)).find(Boolean)
  const fiscalYear = Number(header?.[2])
  if (!title || !header || !footer || fiscalYear !== Number(header[1]) + 1) {
    throw new Error(
      'not an FY total pay report: page 2 header or footer not recognised',
    )
  }
  return {
    kind: title[1] === 'CLASSIFIED' ? 'classified' : 'unclassified',
    fiscalYear,
    extractDate: parseDate(footer[1] ?? null) ?? '',
  }
}

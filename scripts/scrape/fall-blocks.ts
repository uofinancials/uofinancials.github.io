import { lineText, type PdfPage, type TextLine } from './pdf-lines.ts'

const FALL_LABELS = [
  'JOB TYPE',
  'JOB STATUS',
  'JOB START DATE',
  'JOB END DATE',
  'HOME DEPARTMENT',
  'APPT STATUS',
  'RANK',
  'RANK DATE',
  'ACADEMIC TITLE',
  'JOB TITLE',
  'TERM OF SVC',
  'PAY DEPARTMENT',
  'PRIMARY ACTIVITY',
  'ANNUAL SALARY RATE',
  'EEO CATEGORY',
  'APPT PERCENT',
  'OA SALARY GRADE',
  'POSITION CLASS',
] as const

export type FallLabel = (typeof FALL_LABELS)[number]
export type RawBlock = {
  name: string
  page: number
  fields: Map<FallLabel, string>
}
export type PageFailure = { page: number; message: string }

const FIRST_LABEL: FallLabel = 'JOB TYPE'
export const TITLE_LINE = /^(UNCLASSIFIED|CLASSIFIED) PERSONNEL LIST$/
export const CENSUS_LINE =
  /^Employees on Record (?:as of |for )?([A-Z][a-z]+) (\d{1,2}), (\d{4})/
export const FOOTER_LINE =
  /^Source: HRIS Data Warehouse, (\d{1,2}\/\d{1,2}\/\d{4})/
const PAGE_CHROME = [
  TITLE_LINE,
  CENSUS_LINE,
  FOOTER_LINE,
  /^UNIVERSITY OF OREGON$/,
  /^NOTE: An employee/,
  /^UO Office of Institutional Research$/,
]
const LABEL_SET: ReadonlySet<string> = new Set(FALL_LABELS)

type Cell = { label: FallLabel; start: number; end: number }

function isLabel(text: string): text is FallLabel {
  return LABEL_SET.has(text)
}

function labelCells(line: TextLine): Cell[] {
  const labelled = line.items.flatMap((item, index) => {
    const text = item.text.trim()
    return isLabel(text) ? [{ label: text, index, start: item.end }] : []
  })
  return labelled.map(({ label, start }, position) => ({
    label,
    start,
    end: line.items[labelled[position + 1]?.index ?? -1]?.x ?? Infinity,
  }))
}

function valueIn(line: TextLine, cell: Cell): string {
  return lineText({
    y: line.y,
    items: line.items.filter(
      (item) =>
        item.x >= cell.start && item.x < cell.end && !isLabel(item.text.trim()),
    ),
  })
}

export function readFallBlocks(pages: PdfPage[]): {
  blocks: RawBlock[]
  failures: PageFailure[]
} {
  const blocks: RawBlock[] = []
  const failures: PageFailure[] = []
  for (const page of pages.slice(1)) {
    const reader = new PageReader(page.pageNumber)
    reader.read(page.lines.filter((line) => !isPageChrome(lineText(line))))
    blocks.push(...reader.blocks)
    failures.push(...reader.failures)
  }
  return { blocks, failures }
}

class PageReader {
  readonly blocks: RawBlock[] = []
  readonly failures: PageFailure[] = []
  private current: RawBlock | null = null
  private pendingName: string | null = null
  private lastCells: Cell[] = []
  private readonly page: number

  constructor(page: number) {
    this.page = page
  }

  read(lines: TextLine[]): void {
    lines.forEach((line, index) => {
      const cells = labelCells(line)
      if (cells.length > 0) this.readLabelled(line, cells)
      else if (startsRecord(lines[index + 1])) this.pendingName = lineText(line)
      else this.readContinuation(line)
    })
    if (this.pendingName)
      this.fail(`name without a record: ${this.pendingName}`)
  }

  private readLabelled(line: TextLine, cells: Cell[]): void {
    if (line.items[0]?.text.trim() !== cells[0]?.label) {
      this.fail(`text before the first label: ${lineText(line)}`)
      return
    }
    if (cells[0]?.label === FIRST_LABEL) this.startRecord()
    const record = this.current
    if (!record) return
    for (const cell of cells) {
      if (record.fields.has(cell.label)) {
        this.fail(`${record.name}: ${cell.label} appears twice`)
      }
      record.fields.set(cell.label, valueIn(line, cell))
    }
    this.lastCells = cells
  }

  private startRecord(): void {
    if (!this.pendingName) {
      this.fail(`${FIRST_LABEL} without a name line`)
      this.current = null
      return
    }
    this.current = {
      name: this.pendingName,
      page: this.page,
      fields: new Map(),
    }
    this.blocks.push(this.current)
    this.pendingName = null
  }

  private readContinuation(line: TextLine): void {
    const record = this.current
    for (const item of line.items) {
      const cell = this.lastCells.find(
        (candidate) => item.x >= candidate.start && item.x < candidate.end,
      )
      if (!record || !cell) {
        this.fail(`unplaced text: ${lineText(line)}`)
        return
      }
      const joined = `${record.fields.get(cell.label) ?? ''} ${item.text}`
      record.fields.set(cell.label, joined.replace(/\s+/g, ' ').trim())
    }
  }

  private fail(message: string): void {
    this.failures.push({ page: this.page, message })
  }
}

function startsRecord(line: TextLine | undefined): boolean {
  return line?.items[0]?.text.trim() === FIRST_LABEL
}

function isPageChrome(text: string): boolean {
  return PAGE_CHROME.some((pattern) => pattern.test(text))
}

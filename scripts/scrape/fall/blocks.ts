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
export type RawBlock<Label extends string = FallLabel> = {
  name: string
  page: number
  fields: Map<Label, string>
}
export type PageFailure = { page: number; message: string }

/** How one report prints its record blocks. */
export type BlockLayout<Label extends string> = {
  labels: readonly Label[]
  /** The label that opens every record, on the line after its name. */
  firstLabel: Label
  /** Whole lines that are not record text: page headers, footers, notes. */
  skip: readonly RegExp[]
  /** Printed text that stands in for a label, such as a label's qualifier on its own line. */
  aliases?: readonly (readonly [RegExp, Label])[]
}

export const TITLE_LINE = /^(UNCLASSIFIED|CLASSIFIED) PERSONNEL LIST$/
export const CENSUS_LINE =
  /^Employees on Record (?:as of |for )?([A-Z][a-z]+) (\d{1,2}), (\d{4})/
export const FOOTER_LINE =
  /^Source: HRIS Data Warehouse, (\d{1,2}\/\d{1,2}\/\d{4})/
export const REPORT_CHROME = [
  TITLE_LINE,
  /^UNIVERSITY OF OREGON$/,
  /^UO Office of Institutional Research$/,
]

const FALL_LAYOUT: BlockLayout<FallLabel> = {
  labels: FALL_LABELS,
  firstLabel: 'JOB TYPE',
  skip: [...REPORT_CHROME, CENSUS_LINE, FOOTER_LINE, /^NOTE: An employee/],
}

type Cell<Label> = { label: Label; index: number; start: number; end: number }

export function readFallBlocks(pages: PdfPage[]): {
  blocks: RawBlock[]
  failures: PageFailure[]
} {
  return readBlocks(pages, FALL_LAYOUT)
}

export function readBlocks<Label extends string>(
  pages: PdfPage[],
  layout: BlockLayout<Label>,
): { blocks: RawBlock<Label>[]; failures: PageFailure[] } {
  const blocks: RawBlock<Label>[] = []
  const failures: PageFailure[] = []
  for (const page of pages.slice(1)) {
    const reader = new PageReader(page.pageNumber, layout)
    reader.read(
      page.lines.filter(
        (line) => !layout.skip.some((pattern) => pattern.test(lineText(line))),
      ),
    )
    blocks.push(...reader.blocks)
    failures.push(...reader.failures)
  }
  return { blocks, failures }
}

class PageReader<Label extends string> {
  readonly blocks: RawBlock<Label>[] = []
  readonly failures: PageFailure[] = []
  private current: RawBlock<Label> | null = null
  private pendingName: string | null = null
  private lastCells: Cell<Label>[] = []
  private readonly page: number
  private readonly layout: BlockLayout<Label>

  constructor(page: number, layout: BlockLayout<Label>) {
    this.page = page
    this.layout = layout
  }

  read(lines: TextLine[]): void {
    lines.forEach((line, index) => {
      const cells = this.labelCells(line)
      if (cells.length > 0) this.readLabelled(line, cells)
      else if (this.startsRecord(lines[index + 1]))
        this.pendingName = lineText(line)
      else this.readContinuation(line)
    })
    if (this.pendingName)
      this.fail(`name without a record: ${this.pendingName}`)
  }

  private labelOf(text: string): Label | undefined {
    const trimmed = text.trim()
    return (
      this.layout.labels.find((label) => label === trimmed) ??
      this.layout.aliases?.find(([pattern]) => pattern.test(trimmed))?.[1]
    )
  }

  private labelCells(line: TextLine): Cell<Label>[] {
    const labelled = line.items.flatMap((item, index) => {
      const label = this.labelOf(item.text)
      return label ? [{ label, index, start: item.end }] : []
    })
    return labelled.map(({ label, index, start }, position) => ({
      label,
      index,
      start,
      end: line.items[labelled[position + 1]?.index ?? -1]?.x ?? Infinity,
    }))
  }

  private valueIn(line: TextLine, cell: Cell<Label>): string {
    return lineText({
      y: line.y,
      items: line.items.filter(
        (item) =>
          item.x >= cell.start &&
          item.x < cell.end &&
          this.labelOf(item.text) === undefined,
      ),
    })
  }

  private readLabelled(line: TextLine, cells: Cell<Label>[]): void {
    if (cells[0]?.index !== 0) {
      this.fail(`text before the first label: ${lineText(line)}`)
      return
    }
    if (cells[0].label === this.layout.firstLabel) this.startRecord()
    const record = this.current
    if (!record) return
    for (const cell of cells) {
      if (record.fields.has(cell.label)) {
        this.fail(`${record.name}: ${cell.label} appears twice`)
      }
      record.fields.set(cell.label, this.valueIn(line, cell))
    }
    this.lastCells = cells
  }

  private startRecord(): void {
    if (!this.pendingName) {
      this.fail(`${this.layout.firstLabel} without a name line`)
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

  private startsRecord(line: TextLine | undefined): boolean {
    return (
      line !== undefined &&
      this.labelOf(line.items[0]?.text ?? '') === this.layout.firstLabel
    )
  }

  private fail(message: string): void {
    this.failures.push({ page: this.page, message })
  }
}

import { getDocumentProxy } from 'unpdf'

export type TextItem = { x: number; end: number; text: string }
export type TextLine = { y: number; items: TextItem[] }
export type PdfPage = { pageNumber: number; lines: TextLine[] }

const SAME_LINE_TOLERANCE_PT = 2
const SAME_WORD_GAP_PT = 1

export async function readPdfPages(bytes: Uint8Array): Promise<PdfPage[]> {
  const pdf = await getDocumentProxy(bytes)
  const pages: PdfPage[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const items = content.items.flatMap((entry) => {
      if (!('str' in entry) || entry.str.trim() === '') return []
      const [, , , , x, y]: number[] = entry.transform
      if (x === undefined || y === undefined) return []
      return [{ x, y, end: x + entry.width, text: entry.str }]
    })
    pages.push({ pageNumber, lines: groupIntoLines(items) })
  }
  await pdf.cleanup()
  return pages
}

export function groupIntoLines(
  items: (TextItem & { y: number })[],
): TextLine[] {
  const lines: TextLine[] = []
  const byReadingOrder = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  for (const { y, ...item } of byReadingOrder) {
    const line = lines.at(-1)
    if (line && line.y - y < SAME_LINE_TOLERANCE_PT) line.items.push(item)
    else lines.push({ y, items: [item] })
  }
  return lines.map((line) => ({ ...line, items: joinTouching(line.items) }))
}

function joinTouching(items: TextItem[]): TextItem[] {
  const joined: TextItem[] = []
  for (const item of [...items].sort((a, b) => a.x - b.x)) {
    const previous = joined.at(-1)
    if (previous && item.x - previous.end < SAME_WORD_GAP_PT) {
      previous.text += item.text
      previous.end = item.end
    } else {
      joined.push({ ...item })
    }
  }
  return joined
}

export function lineText(line: TextLine): string {
  return line.items
    .map((item) => item.text.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

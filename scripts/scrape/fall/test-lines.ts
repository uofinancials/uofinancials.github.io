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

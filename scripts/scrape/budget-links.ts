import * as cheerio from 'cheerio'

export const BUDGET_REPORTS_PAGE =
  'https://brp.uoregon.edu/content/Budget-Reports'

export type BudgetLink = {
  fiscalYear: number
  period: string
  fileName: string
  url: string
}

const SECTION_HEADING = 'Expenditure Budget Reports'
const FILE_NAME = /^FY(\d{2})_External_Budget_Report_PD(\d{2})\.xlsx$/
const CENTURY = 2000

export function readBudgetLinks(html: string, pageUrl: string): BudgetLink[] {
  const $ = cheerio.load(html)
  const heading = $('h2').filter(
    (_, element) => $(element).text().trim() === SECTION_HEADING,
  )
  if (heading.length !== 1) {
    throw new Error(
      `expected one "${SECTION_HEADING}" heading on ${pageUrl}, found ${heading.length}`,
    )
  }
  const links = heading
    .nextAll('ul')
    .first()
    .find('a[href$=".xlsx"]')
    .map((_, anchor) => {
      const url = new URL($(anchor).attr('href') ?? '', pageUrl)
      const fileName = decodeURIComponent(url.pathname.split('/').at(-1) ?? '')
      const match = FILE_NAME.exec(fileName)
      if (!match)
        throw new Error(
          `unexpected budget file name "${fileName}" on ${pageUrl}`,
        )
      return {
        fiscalYear: CENTURY + Number(match[1]),
        period: match[2] ?? '',
        fileName,
        url: url.href,
      }
    })
    .get()
  if (links.length === 0)
    throw new Error(
      `no budget workbooks under "${SECTION_HEADING}" on ${pageUrl}`,
    )
  return links
}

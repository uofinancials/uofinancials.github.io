import * as cheerio from 'cheerio'
import type { OpeRates } from '../../src/data/ope.ts'

type Row = string[]
const CENTURY = 2000
const PERCENT = /^(\d*)(?:\.(\d{1,2}))?%$/
const BASIS_POINTS_PER_PERCENT = 100
const TO_BE_DETERMINED = /\bTBD\b/

function readTable(html: string, firstHeader: string, page: string): Row[] {
  const $ = cheerio.load(html)
  const tables = $('table')
    .map((_, table) => [
      $(table)
        .find('tr')
        .map((_, row) => [
          $(row)
            .find('th, td')
            .map((_, cell) => $(cell).text().replace(/\s+/g, ' ').trim())
            .get(),
        ])
        .get()
        .filter((cells: Row) => cells.some((cell) => cell !== '')),
    ])
    .get()
  const table = tables.find((rows: Row[]) => rows[0]?.[0] === firstHeader)
  if (!table) throw new Error(`${page}: no table headed "${firstHeader}"`)
  return table
}

export function toBasisPoints(text: string): number {
  const match = PERCENT.exec(text.trim())
  if (!match || (match[1] === '' && match[2] === undefined)) {
    throw new Error(`not a percentage: "${text}"`)
  }
  const [, whole = '', fraction = ''] = match
  return (
    Number(whole || 0) * BASIS_POINTS_PER_PERCENT +
    Number(fraction.padEnd(2, '0'))
  )
}

function expectHeader(
  header: Row | undefined,
  patterns: RegExp[],
  page: string,
): void {
  const matches =
    header?.length === patterns.length &&
    patterns.every((pattern, index) => pattern.test(header[index] ?? ''))
  if (!matches)
    throw new Error(`${page}: unexpected header ${JSON.stringify(header)}`)
}

export function readCurrentRates(
  html: string,
): Pick<OpeRates, 'opeRates' | 'leaveRates'> {
  const page = 'Blended OPE'
  const [header, ...rows] = readTable(html, 'Employee Group', page)
  expectHeader(
    header,
    [
      /^Employee Group$/,
      /^Avg Leave Adjustable Rate$/,
      /^Fiscal Year \d{4}$/,
      /^Avg Leave Adjustable Rate$/,
      /^Estimated Fiscal Year \d{4}$/,
    ],
    page,
  )
  const fiscalYear = Number(header?.[2]?.slice(-4))
  return {
    opeRates: rows.map(([group = '', , rate = '']) => ({
      fiscalYear,
      group,
      basisPoints: toBasisPoints(rate),
      source: 'current' as const,
    })),
    leaveRates: rows.flatMap(([group = '', leave = '']) =>
      readLeaveCell(group, leave, fiscalYear),
    ),
  }
}

function readLeaveCell(
  group: string,
  cell: string,
  fiscalYear: number,
): OpeRates['leaveRates'] {
  if (TO_BE_DETERMINED.test(cell)) return []
  return cell.split(';').map((part) => {
    const words = part.trim().split(' ')
    const rate = words.pop() ?? ''
    const label = words.join(' ')
    return {
      fiscalYear,
      group,
      appliesTo: label === '' ? null : label,
      basisPoints: toBasisPoints(rate),
    }
  })
}

export function readPersRepayment(html: string): OpeRates['persRepayment'] {
  const page = 'Blended OPE'
  const [header, ...rows] = readTable(html, 'Fund Type', page)
  if (header?.[1] !== 'Description') {
    throw new Error(`${page}: unexpected PERS header ${JSON.stringify(header)}`)
  }
  const yearColumns = header.slice(2).map((label) => {
    const years = [...label.matchAll(/FY(\d{2})/g)].map(
      (match) => CENTURY + Number(match[1]),
    )
    if (years.length === 0)
      throw new Error(`${page}: unexpected PERS column "${label}"`)
    return years
  })
  return rows.flatMap(([fund = '', description = '', ...rates]) => {
    const fundType = /^FT (\d{2})$/.exec(fund)?.[1]
    if (!fundType) throw new Error(`${page}: unexpected fund type "${fund}"`)
    return yearColumns.map((fiscalYears, index) => ({
      fundType,
      description,
      fiscalYears,
      basisPoints: toBasisPoints(rates[index] ?? ''),
    }))
  })
}

export function readRateHistory(html: string): OpeRates['opeRates'] {
  const page = 'Blended OPE Rate History'
  const [header, ...rows] = readTable(html, 'Employee Type', page)
  const yearColumns = (header ?? []).slice(1).map((label) => {
    const match = /^Fiscal Year (\d{4})(?: & (\d{4}))?$/.exec(label)
    if (!match) throw new Error(`${page}: unexpected column "${label}"`)
    return [match[1], match[2]].filter(Boolean).map(Number)
  })
  return rows.flatMap(([group = '', ...rates]) =>
    yearColumns.flatMap((years, index) =>
      years.map((fiscalYear) => ({
        fiscalYear,
        group,
        basisPoints: toBasisPoints(rates[index] ?? ''),
        source: 'history' as const,
      })),
    ),
  )
}

export function readRateGroups(html: string): OpeRates['groups'] {
  const page = 'Employee Rate Group Matrix'
  const [header, ...rows] = readTable(html, 'Employee Group', page)
  expectHeader(
    header,
    [/^Employee Group$/, /^EClass Code$/, /^Account Code$/, /^Description$/],
    page,
  )
  return rows.map(
    ([name = '', codes = '', accountCode = '', description = '']) => {
      const listed = codes.split(',').map((code) => code.trim())
      return {
        name,
        eclassCodes: listed.every((code) => /^[A-Z]{2}$/.test(code))
          ? listed
          : [],
        accountCode: /^\d+$/.test(accountCode) ? accountCode : null,
        description,
      }
    },
  )
}

export function combineOpePages(pages: {
  current: string
  history: string
  matrix: string
}): OpeRates {
  const current = readCurrentRates(pages.current)
  const rates: OpeRates = {
    groups: readRateGroups(pages.matrix),
    opeRates: [...readRateHistory(pages.history), ...current.opeRates],
    leaveRates: current.leaveRates,
    persRepayment: readPersRepayment(pages.current),
  }
  const names = new Set(rates.groups.map((group) => group.name))
  const unknown = [
    ...new Set(
      [...rates.opeRates, ...rates.leaveRates].map((rate) => rate.group),
    ),
  ].filter((group) => !names.has(group))
  if (unknown.length > 0) {
    throw new Error(`rate groups not in the matrix: ${unknown.join(', ')}`)
  }
  return rates
}

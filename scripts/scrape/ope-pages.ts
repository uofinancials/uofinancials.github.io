import * as cheerio from 'cheerio'
import type { OpeRates } from '../../src/data/ope.ts'

type Table = string[][]
const CENTURY = 2000
const PERCENT = /^(\d*)(?:\.(\d{1,2}))?%$/
const BASIS_POINTS_PER_PERCENT = 100
const HUNDREDTHS_PER_TENTH = 10
const TO_BE_DETERMINED = /\bTBD\b/

export function readTables(html: string): Table[] {
  const $ = cheerio.load(html)
  return $('table')
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
        .filter((cells: string[]) => cells.some((cell) => cell !== '')),
    ])
    .get()
}

export function toBasisPoints(text: string): number {
  const match = PERCENT.exec(text.replace(/\s+/g, ''))
  if (!match || (match[1] === '' && match[2] === undefined)) {
    throw new Error(`not a percentage: "${text}"`)
  }
  const [, whole = '', fraction = ''] = match
  const hundredths =
    fraction.length === 1
      ? Number(fraction) * HUNDREDTHS_PER_TENTH
      : Number(fraction || 0)
  return Number(whole || 0) * BASIS_POINTS_PER_PERCENT + hundredths
}

function findTable(tables: Table[], firstHeader: string, page: string): Table {
  const table = tables.find((rows) => rows[0]?.[0] === firstHeader)
  if (!table) throw new Error(`${page}: no table headed "${firstHeader}"`)
  return table
}

function expectHeader(
  header: string[] | undefined,
  patterns: RegExp[],
  page: string,
): RegExpExecArray[] {
  const matches = patterns.map((pattern, index) =>
    pattern.exec(header?.[index] ?? ''),
  )
  if (header?.length !== patterns.length || matches.some((match) => !match)) {
    throw new Error(`${page}: unexpected header ${JSON.stringify(header)}`)
  }
  return matches.filter((match): match is RegExpExecArray => match !== null)
}

export function readCurrentRates(
  html: string,
): Pick<OpeRates, 'opeRates' | 'leaveRates'> {
  const page = 'Blended OPE'
  const [header, ...rows] = findTable(readTables(html), 'Employee Group', page)
  const [, , rateYear] = expectHeader(
    header,
    [
      /^Employee Group$/,
      /^Avg Leave Adjustable Rate$/,
      /^Fiscal Year (\d{4})$/,
      /^Avg Leave Adjustable Rate$/,
      /^Estimated Fiscal Year \d{4}$/,
    ],
    page,
  )
  const fiscalYear = Number(rateYear?.[1])
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
    const labelled = /^(.*?)\s*(\d*\.?\d+%)$/.exec(part.trim())
    if (!labelled)
      throw new Error(
        `Blended OPE: unreadable leave rate "${cell}" for ${group}`,
      )
    const [, label = '', rate = ''] = labelled
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
  const [header, ...rows] = findTable(readTables(html), 'Fund Type', page)
  const yearColumns = (header ?? []).slice(2).map((label) => {
    const years = [...label.matchAll(/FY(\d{2})/g)].map(
      (match) => CENTURY + Number(match[1]),
    )
    if (years.length === 0)
      throw new Error(`${page}: unexpected PERS column "${label}"`)
    return years
  })
  if (header?.[0] !== 'Fund Type' || header[1] !== 'Description') {
    throw new Error(`${page}: unexpected PERS header ${JSON.stringify(header)}`)
  }
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
  const [header, ...rows] = findTable(readTables(html), 'Employee Type', page)
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
  const [header, ...rows] = findTable(readTables(html), 'Employee Group', page)
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
  const unknown = [...rates.opeRates, ...rates.leaveRates].filter(
    (rate) => !names.has(rate.group),
  )
  if (unknown.length > 0) {
    throw new Error(
      `rate groups not in the matrix: ${[...new Set(unknown.map((rate) => rate.group))].join(', ')}`,
    )
  }
  return rates
}

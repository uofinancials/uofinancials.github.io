const DOLLARS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const DOLLAR_CHANGE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
})

const COUNT = new Intl.NumberFormat('en-US')

const FTE = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const SHARE = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const CHANGE = new Intl.NumberFormat('en-US', {
  style: 'percent',
  signDisplay: 'exceptZero',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const POINTS = new Intl.NumberFormat('en-US', {
  signDisplay: 'exceptZero',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const YEARS = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const WHOLE = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const TENTHS = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const LIST = new Intl.ListFormat('en-US', { type: 'conjunction' })

const COMPACT_DOLLARS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const ROUNDED_DOLLARS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumSignificantDigits: 3,
})

export const CENTS_PER_DOLLAR = 100
const HUNDREDTHS = 100

/** Formats integer cents as whole dollars, e.g. `$1,916,052,234`. */
export function formatDollars(cents: number): string {
  return DOLLARS.format(Math.round(cents / CENTS_PER_DOLLAR))
}

/** Formats a change in integer cents as signed whole dollars, e.g. `+$43,791,749`. */
export function formatDollarChange(cents: number): string {
  return DOLLAR_CHANGE.format(Math.round(cents / CENTS_PER_DOLLAR))
}

/** Formats integer cents for a chart axis, e.g. `$18.8B`. */
export function formatCompactDollars(cents: number): string {
  return COMPACT_DOLLARS.format(cents / CENTS_PER_DOLLAR)
}

/** Formats integer cents to three significant digits, e.g. `$1.77B`. */
export function formatRoundedDollars(cents: number): string {
  return ROUNDED_DOLLARS.format(cents / CENTS_PER_DOLLAR)
}

export function formatCount(count: number): string {
  return COUNT.format(count)
}

/** Formats FTE held as integer hundredths, e.g. `6,099.4`. */
export function formatFte(hundredths: number): string {
  return FTE.format(hundredths / HUNDREDTHS)
}

/** Formats a fraction as a percent to a tenth, e.g. `40.1%`. */
export function formatPercent(fraction: number): string {
  return SHARE.format(fraction)
}

export function formatShare(part: number, whole: number): string {
  return SHARE.format(whole === 0 ? 0 : part / whole)
}

/** Formats a change given as a fraction, e.g. `+14.1%`. */
export function formatChange(ratio: number): string {
  return CHANGE.format(ratio)
}

const PERCENT_POINTS = 100

/** Formats a difference of two fractions in percentage points, e.g. `+4.2 points`. */
export function formatPoints(difference: number): string {
  return `${POINTS.format(difference * PERCENT_POINTS)} points`
}

/** Formats an index to a whole number, e.g. `127`. */
export function formatIndex(value: number): string {
  return WHOLE.format(value)
}

/** Formats a ratio to a tenth, e.g. `71.0`. */
export function formatRatio(value: number): string {
  return TENTHS.format(value)
}

/** Formats a signed difference to a tenth, e.g. `+14.9`. */
export function formatSigned(value: number): string {
  return POINTS.format(value)
}

/** Joins items as prose, e.g. `A, B, and C`. */
export function formatList(items: string[]): string {
  return LIST.format(items)
}

export function formatYears(years: number): string {
  return `${YEARS.format(years)} years`
}

const WEEKS_DECIMALS = 1

/** Formats weeks of expenses to a tenth, e.g. `-1.0`. */
export function formatWeeks(weeks: number): string {
  return weeks.toFixed(WEEKS_DECIMALS)
}

export const NO_VALUE = '–'

/** Formats a figure that may be missing, showing `NO_VALUE` for it. */
export function formatOrBlank(
  value: number | null | undefined,
  format: (value: number) => string,
): string {
  return value === null || value === undefined ? NO_VALUE : format(value)
}

const SITE_NAME = 'UO Financials'

/** A browser tab title: the parts, most specific first, then the site's name. */
export function tabTitleOf(...parts: string[]): string {
  return [parts.join(' · '), SITE_NAME].join(' | ')
}

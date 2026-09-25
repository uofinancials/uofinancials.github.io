const DOLLARS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
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

const COMPACT_DOLLARS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const CENTS_PER_DOLLAR = 100
const HUNDREDTHS = 100

/** Formats integer cents as whole dollars, e.g. `$1,916,052,234`. */
export function formatDollars(cents: number): string {
  return DOLLARS.format(Math.round(cents / CENTS_PER_DOLLAR))
}

/** Formats integer cents for a chart axis, e.g. `$18.8B`. */
export function formatCompactDollars(cents: number): string {
  return COMPACT_DOLLARS.format(cents / CENTS_PER_DOLLAR)
}

export function formatCount(count: number): string {
  return COUNT.format(count)
}

/** Formats FTE held as integer hundredths, e.g. `6,099.4`. */
export function formatFte(hundredths: number): string {
  return FTE.format(hundredths / HUNDREDTHS)
}

export function formatShare(part: number, whole: number): string {
  return SHARE.format(whole === 0 ? 0 : part / whole)
}

export const NO_VALUE = '–'

/** Formats a figure that may be missing, showing `NO_VALUE` for it. */
export function formatOrBlank(
  value: number | null | undefined,
  format: (value: number) => string,
): string {
  return value === null || value === undefined ? NO_VALUE : format(value)
}

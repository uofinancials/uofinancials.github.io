const DOLLARS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const COUNT = new Intl.NumberFormat('en-US')

const CENTS_PER_DOLLAR = 100

/** Formats integer cents as whole dollars, e.g. `$1,916,052,234`. */
export function formatDollars(cents: number): string {
  return DOLLARS.format(Math.round(cents / CENTS_PER_DOLLAR))
}

export function formatCount(count: number): string {
  return COUNT.format(count)
}

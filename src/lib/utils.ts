export { cn } from 'cn'

export const NUMBER_CELL = 'text-right tabular-nums'
export const WRAP_CELL = 'min-w-40 whitespace-normal'

const PERCENT = 100

/** A fraction from 0 to 1 as a CSS length, e.g. `40%`. */
export function widthOf(fraction: number): string {
  return `${fraction * PERCENT}%`
}

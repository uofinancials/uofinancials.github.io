/** Each value as a fraction of the largest, from 0 to 1; a null, zero, or negative value is 0. */
export function shareOfLargest(values: (number | null)[]): number[] {
  const largest = Math.max(0, ...values.map((value) => value ?? 0))
  return values.map((value) =>
    largest === 0 || value === null || value <= 0 ? 0 : value / largest,
  )
}

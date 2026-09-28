export const MIN_LINE_POINTS = 2

/** A labelled vertical mark at one of a chart's x labels. */
export type ChartMarker = { x: string; label: string }

/** Why a chart is too sparse to draw lines: `null` when two or more labels have a value in any series, else the labels that do. */
export function sparseNote(
  labels: string[],
  series: (number | null)[][],
): string | null {
  const valued = labels.filter((_, index) =>
    series.some((values) => (values[index] ?? null) !== null),
  )
  if (valued.length >= MIN_LINE_POINTS) return null
  return valued.length === 0 ? 'No figures.' : `Only in ${valued.join(', ')}.`
}

export function isAnyBelowZero(series: (number | null)[][]): boolean {
  return series.some((values) =>
    values.some((value) => value !== null && value < 0),
  )
}

/** Marks the first label whose value is below zero, as "{subject} below zero from {label}". */
export function belowZeroMarker(
  labels: string[],
  values: number[],
  subject: string,
): ChartMarker | undefined {
  const x = labels[values.findIndex((value) => value < 0)]
  return x === undefined
    ? undefined
    : { x, label: `${subject} below zero from ${x}` }
}

/** Each value as a fraction of the largest, from 0 to 1; a null, zero, or negative value is 0. */
export function shareOfLargest(values: (number | null)[]): number[] {
  const largest = Math.max(0, ...values.map((value) => value ?? 0))
  return values.map((value) =>
    largest === 0 || value === null || value <= 0 ? 0 : value / largest,
  )
}

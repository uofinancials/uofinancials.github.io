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

/** The change from one figure to another as a fraction of the first; `null` when either is missing or the first is not above zero. */
export function changeOf(
  from: number | null,
  to: number | null,
): number | null {
  if (from === null || to === null || from <= 0) return null
  return (to - from) / from
}

/** Positions nearest the given ones, in the same order, each at least `gap` from its neighbours and kept within `[min, max]` where they fit. */
export function spreadLabels(
  positions: number[],
  gap: number,
  [min, max]: [number, number],
): number[] {
  const order = positions
    .map((position, index) => ({ position, index }))
    .sort((a, b) => a.position - b.position)
  const placed: number[] = []
  for (const { position } of order) {
    const previous = placed.at(-1)
    placed.push(
      previous === undefined
        ? Math.max(position, min)
        : Math.max(position, previous + gap),
    )
  }
  let limit = max
  for (let rank = placed.length - 1; rank >= 0; rank -= 1) {
    const position = Math.min(placed[rank] ?? limit, limit)
    placed[rank] = position
    limit = position - gap
  }
  const spread = [...positions]
  order.forEach(({ index }, rank) => {
    spread[index] = placed[rank] ?? positions[index] ?? min
  })
  return spread
}

/** Items with a change, largest first, each placed on one axis from the smallest change (or zero) to the largest (or zero): `offset` is where its bar starts and `width` its length, both fractions of the axis, and `zero` is where zero falls on it. Items without a change are left out. */
export function rankByChange(items: { key: string; change: number | null }[]): {
  zero: number
  ranked: { key: string; change: number; offset: number; width: number }[]
} {
  const ranked = items
    .flatMap(({ key, change }) => (change === null ? [] : [{ key, change }]))
    .sort((a, b) => b.change - a.change)
  const low = Math.min(0, ...ranked.map(({ change }) => change))
  const high = Math.max(0, ...ranked.map(({ change }) => change))
  const span = high - low
  const at = (value: number) => (span === 0 ? 0 : (value - low) / span)
  return {
    zero: at(0),
    ranked: ranked.map((item) => ({
      ...item,
      offset: at(Math.min(item.change, 0)),
      width: span === 0 ? 0 : Math.abs(item.change) / span,
    })),
  }
}

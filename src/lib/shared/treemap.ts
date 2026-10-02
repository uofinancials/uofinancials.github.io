export type Rect = { x: number; y: number; width: number; height: number }

const sumOf = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0)

/** How far from square the least square rectangle is, when the areas share one row along a side of the given length; 1 is square. */
function worstRatio(areas: number[], side: number): number {
  const total = sumOf(areas)
  return Math.max(
    (side * side * Math.max(...areas)) / (total * total),
    (total * total) / (side * side * Math.min(...areas)),
  )
}

/** Places the areas as one row along the free box's shorter side, and returns the box left over. */
function placeRow(areas: number[], free: Rect, placed: Rect[]): Rect {
  const total = sumOf(areas)
  if (free.width >= free.height) {
    const width = total / free.height
    let y = free.y
    for (const area of areas) {
      const height = area / width
      placed.push({ x: free.x, y, width, height })
      y += height
    }
    return { ...free, x: free.x + width, width: free.width - width }
  }
  const height = total / free.width
  let x = free.x
  for (const area of areas) {
    const width = area / height
    placed.push({ x, y: free.y, width, height })
    x += width
  }
  return { ...free, y: free.y + height, height: free.height - height }
}

/** Squarified rectangles for the values, in order, filling the box; each one's area is its value's share of the total. Values must be above zero and sorted largest first. */
export function treemapLayout(
  values: number[],
  box: { width: number; height: number },
): Rect[] {
  const scale = (box.width * box.height) / sumOf(values)
  const placed: Rect[] = []
  let free: Rect = { x: 0, y: 0, ...box }
  let row: number[] = []
  for (const value of values) {
    const area = value * scale
    const side = Math.min(free.width, free.height)
    if (
      row.length > 0 &&
      worstRatio([...row, area], side) > worstRatio(row, side)
    ) {
      free = placeRow(row, free, placed)
      row = []
    }
    row.push(area)
  }
  placeRow(row, free, placed)
  return placed
}

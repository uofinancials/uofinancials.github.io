const LINE_COLORS = 8

/** The theme's `--line-N` color for a series, by its fixed place among the view's series. */
export function lineColor(index: number): string {
  return `var(--line-${(index % LINE_COLORS) + 1})`
}

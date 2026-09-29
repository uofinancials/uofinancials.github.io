/** An active filter as a removable chip: what it reads, and the search that clears it. */
export type FilterChip<Search> = { text: string; clear: Search }

/** The search that clears every chip's filter at once, leaving the rest of the view. */
export function clearAllOf<Search extends object>(
  chips: FilterChip<Search>[],
): Partial<Search> {
  const cleared: Partial<Search> = {}
  for (const { clear } of chips) Object.assign(cleared, clear)
  return cleared
}

/** How many filters are on, for a folded panel's summary line. */
export function filterCountText(count: number): string {
  if (count === 0) return 'No filters'
  return count === 1 ? '1 filter' : `${count} filters`
}

import {
  formatChange,
  formatCount,
  formatDollars,
  formatPercent,
  formatRoundedDollars,
} from '../shared/format.ts'
import { compareKeys } from '../shared/sort.ts'
import { SIZE_NOUNS, type SizeMeasure, sizeOf } from './measures.ts'
import type { DepartmentRow } from './table.ts'

export type TileDirection = 'rose' | 'fell' | 'flat'

export type Tile = {
  /** `null` for the jobs placed in no area, which have no page. */
  code: string | null
  name: string
  /** Above zero. */
  value: number
  /** Its value over the sum of the tiles' values. */
  share: number
  /** The measure's change from the year before; `null` where the table leaves it blank. */
  change: number | null
  /** `flat` for no change and for a blank one. */
  direction: TileDirection
}

function directionOf(change: number | null): TileDirection {
  if (change === null || change === 0) return 'flat'
  return change > 0 ? 'rose' : 'fell'
}

/** The rows with a figure above zero as tiles, largest first, ties by name, and how many rows were left out. */
export function departmentTiles(
  rows: DepartmentRow[],
  measure: SizeMeasure,
): { tiles: Tile[]; notDrawn: number } {
  const sized = rows
    .flatMap((row) => {
      const value = sizeOf(row, measure)
      return value !== null && value > 0 ? [{ row, value }] : []
    })
    .sort((a, b) => b.value - a.value || compareKeys(a.row.name, b.row.name))
  const total = sized.reduce((sum, { value }) => sum + value, 0)
  return {
    tiles: sized.map(({ row, value }) => {
      const change = row.changes[measure]
      return {
        code: row.code,
        name: row.name,
        value,
        share: value / total,
        change,
        direction: directionOf(change),
      }
    }),
    notDrawn: rows.length - sized.length,
  }
}

export const TREEMAP_METHOD =
  'In the chart, a tile’s area is its figure’s share of the figures drawn, which leave out every row with no figure above zero. Its color is the direction of the change the table shows beside that figure.'

/** A tile's figures as the chart words them: the rounded figure and bare change a tile prints, the full phrases its tooltip lists, and those phrases after its name as one sentence. */
export function tileText(tile: Tile, measure: SizeMeasure, since: string) {
  const isCount = measure === 'jobs'
  const count = formatCount(tile.value)
  const figure = isCount ? `${count} jobs` : formatDollars(tile.value)
  const share = `${formatPercent(tile.share)} of the ${SIZE_NOUNS[measure]} drawn`
  const change = tile.change === null ? null : formatChange(tile.change)
  const changed = change === null ? null : `${change} from ${since}`
  return {
    /** Three digits for money, e.g. `$240M`; a count as it is. */
    short: isCount ? count : formatRoundedDollars(tile.value),
    /** `null` where the table leaves the change blank. */
    change,
    figure,
    share,
    changed,
    summary: `${tile.name}: ${figure}, ${share}${changed ? `, ${changed}` : ''}`,
  }
}

/** How many rows the chart leaves out, as a sentence. */
export function notDrawnNote(
  count: number,
  kind: 'area' | 'unit',
  measure: SizeMeasure,
): string {
  const isOne = count === 1
  return `${formatCount(count)} ${isOne ? kind : `${kind}s`} with no ${SIZE_NOUNS[measure]} above zero ${isOne ? 'is' : 'are'} not drawn; the table lists ${isOne ? 'it' : 'them'}.`
}

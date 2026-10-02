import { compareKeys } from '../shared/sort.ts'
import type { DepartmentRow } from './table.ts'

/** The figures that add up across rows, so one can size a row against the rest. */
export const SIZE_MEASURES = ['budget', 'spend', 'jobs'] as const
export type SizeMeasure = (typeof SIZE_MEASURES)[number]

type Sized = Pick<DepartmentRow, 'budgetCents' | 'spendCents' | 'jobs'>

const SIZE_VALUES: Record<SizeMeasure, (row: Sized) => number | null> = {
  budget: (row) => row.budgetCents,
  spend: (row) => row.spendCents,
  jobs: (row) => row.jobs,
}

/** A row's figure for the measure: cents for budget and spend, a count for jobs. */
export function sizeOf(row: Sized, measure: SizeMeasure): number | null {
  return SIZE_VALUES[measure](row)
}

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

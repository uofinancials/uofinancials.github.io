import type { FallYear } from '../data/fall.ts'
import type {
  AcrossTheBoardTerm,
  RaiseTerm,
  RaiseTerms,
} from '../data/raises.ts'
import type { ContinuingPair } from './pay-changes.ts'
import { RAISE_ROWS, type RaiseRow } from './raise-groups.ts'
import { MIN_JOBS_SHOWN, medianOf } from './trends.ts'

export const BASIS_POINTS_PER_UNIT = 10_000

/** A pair's census dates: a term counts if it took effect after `after` and on or before `through`. */
export type CensusWindow = { after: string; through: string }

export function censusWindow(
  years: FallYear[],
  fromYear: number,
): CensusWindow | null {
  const dateOf = (year: number) =>
    years.find(({ censusDate }) => censusDate.startsWith(`${year}-`))
      ?.censusDate
  const after = dateOf(fromYear)
  const through = dateOf(fromYear + 1)
  return after && through ? { after, through } : null
}

/** The compounded across-the-board increase, in basis points, and the terms it compounds. */
export type AcrossTheBoard = {
  basisPoints: number
  terms: AcrossTheBoardTerm[]
}

function isInWindow(
  { effectiveDate, effectiveBetween }: AcrossTheBoardTerm,
  { after, through }: CensusWindow,
): boolean {
  const first = effectiveDate ?? effectiveBetween?.from
  const last = effectiveDate ?? effectiveBetween?.to
  return !!first && !!last && first > after && last <= through
}

/** `null` when no across-the-board term for the row took effect in the window. */
export function acrossTheBoard(
  terms: RaiseTerm[],
  row: RaiseRow,
  window: CensusWindow,
): AcrossTheBoard | null {
  const used = terms.filter(
    (term): term is AcrossTheBoardTerm =>
      term.kind === 'across-the-board' &&
      term.employeeGroup === row.group &&
      (term.populations.includes('all') ||
        term.populations.includes(row.population)) &&
      isInWindow(term, window),
  )
  if (used.length === 0) return null
  return { basisPoints: compoundBasisPoints(used), terms: used }
}

/** Exact in integers, then rounded half up to the basis point. */
function compoundBasisPoints(terms: AcrossTheBoardTerm[]): number {
  const unit = BigInt(BASIS_POINTS_PER_UNIT)
  let product = unit
  let scale = 1n
  for (const { basisPoints } of terms) {
    product *= unit + BigInt(basisPoints)
    scale *= unit
  }
  return Number((product * 2n + scale) / (scale * 2n) - unit)
}

/** `median` and `other` are fractions of the earlier rate; `other` is the median minus the across-the-board increase. */
export type RaiseComparisonRow = {
  row: RaiseRow
  jobs: number
  median: number | null
  acrossTheBoard: AcrossTheBoard | null
  other: number | null
}

export type RaiseComparison = {
  rows: RaiseComparisonRow[]
  /** Continuing jobs in no raise row. */
  unplaced: number
  /** Every term the rows compound, each once. */
  terms: AcrossTheBoardTerm[]
  /** The recorded gaps of the rows' groups. */
  gaps: RaiseTerms['gaps']
}

function compareRow(
  row: RaiseRow,
  pairs: ContinuingPair[],
  terms: RaiseTerm[],
  window: CensusWindow,
): RaiseComparisonRow {
  const ratios = pairs
    .filter(({ raise }) => raise === row)
    .map(({ ratio }) => ratio)
  const median = ratios.length >= MIN_JOBS_SHOWN ? medianOf(ratios) : null
  const increase = acrossTheBoard(terms, row, window)
  return {
    row,
    jobs: ratios.length,
    median,
    acrossTheBoard: increase,
    other:
      median !== null && increase
        ? median - increase.basisPoints / BASIS_POINTS_PER_UNIT
        : null,
  }
}

/** One pair year's continuing jobs by raise row; a row with no job and no term is left out. */
export function raiseComparison(
  pairs: ContinuingPair[],
  { terms, gaps }: RaiseTerms,
  window: CensusWindow,
): RaiseComparison {
  const rows = RAISE_ROWS.map((row) =>
    compareRow(row, pairs, terms, window),
  ).filter(({ jobs, acrossTheBoard }) => jobs > 0 || acrossTheBoard)
  return {
    rows,
    unplaced: pairs.filter(({ raise }) => raise === null).length,
    terms: [
      ...new Set(
        rows.flatMap(({ acrossTheBoard }) => acrossTheBoard?.terms ?? []),
      ),
    ],
    gaps: gaps.filter(({ employeeGroup }) =>
      rows.some(({ row }) => row.group === employeeGroup),
    ),
  }
}

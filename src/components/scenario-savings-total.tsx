import { formatDollars, formatShare } from '@/lib/format'

/** A year's E&G savings before freezes, as a share of the Board's reduction estimate. */
export function ScenarioSavingsTotal({
  totalCents,
  eliminatedCents,
  reductionTargetCents,
}: {
  totalCents: number
  /** `null` when the scenario has no elimination. */
  eliminatedCents: number | null
  reductionTargetCents: number
}) {
  return (
    <p className="text-sm">
      {eliminatedCents === null
        ? "The census rules' E&G savings are "
        : `E&G savings from the census rules and eliminations, ${formatDollars(totalCents)} a year with ${formatDollars(eliminatedCents)} from eliminations, are `}
      {formatShare(totalCents, reductionTargetCents)} of the Board's{' '}
      {formatDollars(reductionTargetCents)} a year reduction estimate. That
      estimate is close to the projected gap's present value, not the gap in any
      one year.
    </p>
  )
}

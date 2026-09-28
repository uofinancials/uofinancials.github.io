import { lineColor } from '@/components/charts/line-color'
import { TREND_GROUPS } from '@/lib/census/groups'

const GROUP_ORDER: readonly string[] = TREND_GROUPS

/** A group's line color, the same in every chart of the trends report. */
export function groupColor(key: string): string {
  return lineColor(GROUP_ORDER.indexOf(key))
}

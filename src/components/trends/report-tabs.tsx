import { Link } from '@tanstack/react-router'
import {
  SCROLL_ROW_CLASS,
  TAB_LINK_CLASS,
  TAB_LIST_CLASS,
} from '@/components/layout/nav-link-class'
import { revealInRow } from '@/components/layout/reveal-in-row'
import {
  REPORT_TAB_LABELS,
  REPORT_TABS,
  type ReportTab,
} from '@/lib/trends/search'
import { cn } from '@/lib/utils'

/** The report's questions as tabs held in the URL; on a narrow screen the row scrolls sideways and opens with the current tab in view. */
export function ReportTabs({ tab }: { tab: ReportTab }) {
  return (
    <nav aria-label="Questions">
      <ul
        className={cn(
          TAB_LIST_CLASS,
          SCROLL_ROW_CLASS,
          'flex-nowrap md:flex-wrap',
        )}
      >
        {REPORT_TABS.map((option) => (
          <li key={option} className="shrink-0">
            <Link
              from="/trends"
              to="/trends"
              search={(previous) => ({ ...previous, tab: option })}
              resetScroll={false}
              ref={option === tab ? revealInRow : undefined}
              aria-current={option === tab ? 'page' : undefined}
              className={TAB_LINK_CLASS}
            >
              {REPORT_TAB_LABELS[option]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

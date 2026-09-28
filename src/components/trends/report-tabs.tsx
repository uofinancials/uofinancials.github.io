import { Link } from '@tanstack/react-router'
import { TAB_LINK_CLASS } from '@/components/layout/nav-link-class'
import { REPORT_TABS, type ReportTab } from '@/lib/trends/search'

const TAB_LABELS: Record<ReportTab, string> = {
  grew: 'Which groups grew?',
  money: 'Where did the money go?',
  pay: 'More people, or higher pay?',
  raises: 'What raises did people get?',
  compare: 'How does it compare?',
  groups: 'How are groups defined?',
}

/** The report's questions as tabs held in the URL; the row scrolls sideways on a narrow screen. */
export function ReportTabs({ tab }: { tab: ReportTab }) {
  return (
    <nav aria-label="Questions">
      <ul className="-mx-4 flex overflow-x-auto border-b px-4 md:mx-0 md:flex-wrap md:px-0">
        {REPORT_TABS.map((option) => (
          <li key={option} className="shrink-0">
            <Link
              from="/trends"
              to="/trends"
              search={(previous) => ({ ...previous, tab: option })}
              resetScroll={false}
              aria-current={option === tab ? 'page' : undefined}
              className={TAB_LINK_CLASS}
            >
              {TAB_LABELS[option]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

import { Link, Outlet } from '@tanstack/react-router'
import { NAV_LINK_CLASS } from '@/components/layout/nav-link-class'
import { cn } from '@/lib/utils'

const REPO_URL = 'https://github.com/uofinancials/uofinancials.github.io'
const ISSUES_URL = `${REPO_URL}/issues`
const CODE_LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`
const DATA_LICENSE_URL = `${REPO_URL}/blob/main/public/data/LICENSE`

const MAIN_ID = 'content'

const NAV_LINKS = [
  ['/budget', 'Budget'],
  ['/scenarios', 'Scenarios'],
  ['/trends', 'Trends'],
  ['/departments', 'Departments'],
  ['/people', 'People'],
  ['/sources', 'Sources'],
] as const

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-50 focus:rounded-md focus:border focus:bg-background focus:px-3 focus:py-2 focus:text-sm"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById(MAIN_ID)?.focus()
        }}
      >
        Skip to content
      </a>
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-[75rem] flex-wrap items-center gap-x-6 gap-y-1 px-4 pt-2.5 md:px-6 md:pb-2.5">
          <Link to="/" className="font-semibold">
            UO Financials
          </Link>
          <nav aria-label="Main" className="w-full md:w-auto">
            <ul className="scroll-edge -mx-4 flex gap-x-4 overflow-x-auto px-4 pb-2.5 text-sm md:mx-0 md:flex-wrap md:gap-y-1 md:overflow-visible md:px-0 md:pb-0">
              {NAV_LINKS.map(([to, label]) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={cn(
                      NAV_LINK_CLASS,
                      'inline-block py-1 whitespace-nowrap',
                    )}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-[75rem] flex-1 p-4 outline-none md:p-6"
      >
        <Outlet />
      </main>
      <footer className="border-t p-6 text-center text-sm text-muted-foreground">
        <p>
          This is an independent site. It is not affiliated with, endorsed by,
          or sponsored by the University of Oregon.
        </p>
        <p>
          Found an error?{' '}
          <a className="link" href={ISSUES_URL}>
            Report it
          </a>
          .
        </p>
        <p>
          Source on{' '}
          <a className="link" href={REPO_URL}>
            GitHub
          </a>
          . Code is{' '}
          <a className="link" href={CODE_LICENSE_URL}>
            MIT licensed
          </a>
          ; data is{' '}
          <a className="link" href={DATA_LICENSE_URL}>
            CC0
          </a>
          .
        </p>
      </footer>
    </div>
  )
}

import { Link, Outlet } from '@tanstack/react-router'

const REPO_URL = 'https://github.com/uofinancials/uofinancials.github.io'
const ISSUES_URL = `${REPO_URL}/issues`
const CODE_LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`
const DATA_LICENSE_URL = `${REPO_URL}/blob/main/public/data/LICENSE`

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
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-[75rem] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6">
          <Link to="/" className="font-semibold">
            UO Financials
          </Link>
          <nav aria-label="Main">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {NAV_LINKS.map(([to, label]) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-muted-foreground underline-offset-4 hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[75rem] flex-1 p-4 md:p-6">
        <Outlet />
      </main>
      <footer className="border-t p-6 text-center text-sm text-muted-foreground">
        <p>
          This is an independent site. It is not affiliated with, endorsed by,
          or sponsored by the University of Oregon.
        </p>
        <p>
          Found an error?{' '}
          <a className="underline" href={ISSUES_URL}>
            Report it
          </a>
          .
        </p>
        <p>
          Source on{' '}
          <a className="underline" href={REPO_URL}>
            GitHub
          </a>
          . Code is{' '}
          <a className="underline" href={CODE_LICENSE_URL}>
            MIT licensed
          </a>
          ; data is{' '}
          <a className="underline" href={DATA_LICENSE_URL}>
            CC0
          </a>
          .
        </p>
      </footer>
    </div>
  )
}

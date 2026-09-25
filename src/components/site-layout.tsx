import { Link, Outlet } from '@tanstack/react-router'

const ISSUES_URL =
  'https://github.com/uofinancials/uofinancials.github.io/issues'

const NAV_LINKS = [
  ['/trends', 'Trends'],
  ['/departments', 'Departments'],
  ['/salaries', 'Salaries'],
  ['/pay-changes', 'Pay changes'],
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
                    className="text-muted-foreground hover:text-foreground"
                    activeProps={{ className: 'text-foreground' }}
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
      </footer>
    </div>
  )
}

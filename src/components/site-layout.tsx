import { Link, Outlet } from '@tanstack/react-router'

const ISSUES_URL =
  'https://github.com/uofinancials/uofinancials.github.io/issues'

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6">
          <Link to="/" className="font-semibold">
            UO Financials
          </Link>
          <nav aria-label="Main">
            <ul className="flex gap-4 text-sm">
              <li>
                <Link
                  to="/trends"
                  className="text-muted-foreground hover:text-foreground"
                  activeProps={{ className: 'text-foreground' }}
                >
                  Trends
                </Link>
              </li>
              <li>
                <Link
                  to="/departments"
                  className="text-muted-foreground hover:text-foreground"
                  activeProps={{ className: 'text-foreground' }}
                >
                  Departments
                </Link>
              </li>
              <li>
                <Link
                  to="/salaries"
                  className="text-muted-foreground hover:text-foreground"
                  activeProps={{ className: 'text-foreground' }}
                >
                  Salaries
                </Link>
              </li>
              <li>
                <Link
                  to="/sources"
                  className="text-muted-foreground hover:text-foreground"
                  activeProps={{ className: 'text-foreground' }}
                >
                  Sources
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-6">
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

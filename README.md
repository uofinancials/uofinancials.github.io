# UO Financials

An independent look at University of Oregon pay and budgets: salary, headcount,
and budget data from the university's own public reports, as dashboards and
what-if scenarios.

This site is not affiliated with, endorsed by, or sponsored by the University of
Oregon.

Live at <https://uofinancials.github.io/>.

## Development

Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm dev      # local server
pnpm check    # lint, format, types
pnpm test     # unit tests
pnpm e2e      # end-to-end tests against the production build
pnpm fix      # apply formatting
```

Pushing to `main` deploys to GitHub Pages.

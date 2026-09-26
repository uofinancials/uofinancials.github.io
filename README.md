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

## License

The code is under the [MIT License](LICENSE). The data under `public/data/` is
dedicated to the public domain under [CC0 1.0](public/data/LICENSE). If you
reuse the data, please cite the source documents it was extracted from; the
site's Sources page lists each one with its retrieval date.

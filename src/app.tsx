import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const ISSUES_URL =
  'https://github.com/uofinancials/uofinancials.github.io/issues'

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <Card>
          <CardHeader>
            <CardTitle>UO Financials</CardTitle>
            <CardDescription>
              An independent look at University of Oregon pay and budgets
            </CardDescription>
          </CardHeader>
        </Card>
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

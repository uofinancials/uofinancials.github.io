import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p>
        <Link to="/" className="underline">
          Go to the home page
        </Link>
      </p>
    </div>
  )
}

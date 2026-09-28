import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-title">Page not found</h1>
      <p>
        <Link to="/" className="link">
          Go to the home page
        </Link>
      </p>
    </div>
  )
}

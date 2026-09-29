import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/page-header'

export function NotFoundPage() {
  return (
    <PageHeader title="Page not found">
      <p>
        <Link to="/" className="link">
          Go to the home page
        </Link>
      </p>
    </PageHeader>
  )
}

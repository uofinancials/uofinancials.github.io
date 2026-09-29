import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'

const BACK_CLASS = 'text-sm link'

/** Back to where the reader came from, or to the people list when they arrived here directly. */
export function BackButton() {
  const router = useRouter()
  if (!useCanGoBack()) {
    return (
      <Link className={BACK_CLASS} to="/people">
        Back to people
      </Link>
    )
  }
  return (
    <button
      type="button"
      className={BACK_CLASS}
      onClick={() => router.history.back()}
    >
      Back
    </button>
  )
}

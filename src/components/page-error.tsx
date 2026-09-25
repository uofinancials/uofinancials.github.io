import { type ErrorComponentProps, useRouter } from '@tanstack/react-router'

export function PageError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div role="alert" className="space-y-3">
      <h1 className="text-2xl font-semibold">This page could not load</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        className="rounded-md border px-3 py-1.5 text-sm"
        onClick={() => router.invalidate()}
      >
        Try again
      </button>
    </div>
  )
}

import { type NavigateOptions, useRouter } from '@tanstack/react-router'

/** Navigates once the next view's route data has loaded; otherwise the router's pending page replaces a slow load and drops the reader's focus. */
export function usePreloadedNavigate() {
  const router = useRouter()
  return async (options: NavigateOptions) => {
    await router.preloadRoute(options)
    await router.navigate(options)
  }
}

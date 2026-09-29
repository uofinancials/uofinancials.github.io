import { type NavigateOptions, useRouter } from '@tanstack/react-router'

/**
 * Navigates once the next view's route data has loaded. A search change that
 * reloads a route otherwise shows the router's pending page after a second,
 * which unmounts the page and drops the reader's focus and open panels.
 */
export function usePreloadedNavigate() {
  const router = useRouter()
  return async (options: NavigateOptions) => {
    await router.preloadRoute(options)
    await router.navigate(options)
  }
}

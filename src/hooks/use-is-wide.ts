import { useSyncExternalStore } from 'react'

/** Tailwind's `md` breakpoint. */
const WIDE_QUERY = '(min-width: 48rem)'

function subscribe(onChange: () => void) {
  const list = matchMedia(WIDE_QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

/** Whether the viewport is at least `md` wide, following resizes. */
export function useIsWide(): boolean {
  return useSyncExternalStore(subscribe, () => matchMedia(WIDE_QUERY).matches)
}

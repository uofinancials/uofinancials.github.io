import {
  DISALLOW_EVERYTHING,
  isAllowed,
  parseRobots,
  type RobotsRules,
} from './robots.ts'

const PRODUCT_TOKEN = 'UOFinancialsBot'
const USER_AGENT = `${PRODUCT_TOKEN}/1.0 (+https://uofinancials.github.io/)`
const MIN_INTERVAL_MS = 2000
const HTTP_SERVER_ERROR = 500

const lastRequestAt = new Map<string, number>()
const robotsByOrigin = new Map<string, RobotsRules>()

// ponytail: per-host spacing assumes callers fetch sequentially; a queue per host if requests ever run concurrently.
async function spaced(
  host: string,
  request: () => Promise<Response>,
): Promise<Response> {
  const wait = (lastRequestAt.get(host) ?? 0) + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  try {
    return await request()
  } finally {
    lastRequestAt.set(host, Date.now())
  }
}

async function robotsFor(url: URL): Promise<RobotsRules> {
  const cached = robotsByOrigin.get(url.origin)
  if (cached) return cached
  const response = await spaced(url.host, () =>
    fetch(`${url.origin}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
    }),
  )
  const rules = response.ok
    ? parseRobots(await response.text(), PRODUCT_TOKEN)
    : response.status >= HTTP_SERVER_ERROR
      ? DISALLOW_EVERYTHING
      : parseRobots('', PRODUCT_TOKEN)
  robotsByOrigin.set(url.origin, rules)
  return rules
}

export async function politeFetch(
  address: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  const url = new URL(address)
  if (!isAllowed(await robotsFor(url), url.pathname + url.search)) {
    throw new Error(`robots.txt disallows ${address}`)
  }
  const response = await spaced(url.host, () =>
    fetch(url, { headers: { ...headers, 'User-Agent': USER_AGENT } }),
  )
  console.log(`GET ${address} ${response.status}`)
  return response
}

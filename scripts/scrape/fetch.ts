import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { today } from './manifest-file.ts'
import {
  ALLOW_EVERYTHING,
  DISALLOW_EVERYTHING,
  isAllowed,
  parseRobots,
  type RobotsRules,
} from './robots.ts'

const PRODUCT_TOKEN = 'UOFinancialsBot'
const USER_AGENT = `${PRODUCT_TOKEN}/1.0 (+https://uofinancials.github.io/)`
const MIN_INTERVAL_MS = 2000
const HTTP_SERVER_ERROR = 500
const HTTP_NOT_MODIFIED = 304

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
  console.log(`GET ${url.origin}/robots.txt ${response.status}`)
  const rules = await rulesFrom(response)
  robotsByOrigin.set(url.origin, rules)
  return rules
}

async function rulesFrom(response: Response): Promise<RobotsRules> {
  if (response.ok) return parseRobots(await response.text(), PRODUCT_TOKEN)
  if (response.status >= HTTP_SERVER_ERROR) return DISALLOW_EVERYTHING
  return ALLOW_EVERYTHING
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

const cachedSourceSchema = z.strictObject({
  url: z.url(),
  lastModified: z.string().min(1).nullable(),
  retrievedOn: z.iso.date(),
})
export type CachedSource = z.infer<typeof cachedSourceSchema> & {
  bytes: Buffer
}

async function readSidecar(sidecar: string, file: string) {
  if (!existsSync(file) || !existsSync(sidecar)) return null
  return cachedSourceSchema.parse(JSON.parse(await readFile(sidecar, 'utf8')))
}

export async function fetchCached(
  address: string,
  file: string,
): Promise<CachedSource> {
  const sidecar = `${file}.json`
  const cached = await readSidecar(sidecar, file)
  const response = await politeFetch(
    address,
    cached?.lastModified ? { 'If-Modified-Since': cached.lastModified } : {},
  )
  if (cached && response.status === HTTP_NOT_MODIFIED) {
    return { ...cached, bytes: await readFile(file) }
  }
  if (!response.ok)
    throw new Error(`GET ${address} returned ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const source = {
    url: address,
    lastModified: response.headers.get('last-modified'),
    retrievedOn: today(),
  }
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, bytes)
  await writeFile(sidecar, `${JSON.stringify(source, null, 2)}\n`)
  return { ...source, bytes }
}

export type RobotsRules = { allow: string[]; disallow: string[] }

const ALLOW_EVERYTHING: RobotsRules = { allow: [], disallow: [] }
export const DISALLOW_EVERYTHING: RobotsRules = { allow: [], disallow: ['/'] }

type Group = { agents: string[]; rules: RobotsRules }

function parseGroups(text: string): Group[] {
  const groups: Group[] = []
  let current: Group | null = null
  let lastWasAgent = false
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line)
    if (!match) continue
    const [, field = '', value = ''] = match
    const key = field.toLowerCase()
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: { allow: [], disallow: [] } }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (current && value !== '' && (key === 'allow' || key === 'disallow')) {
      current.rules[key].push(value)
    }
  }
  return groups
}

export function parseRobots(text: string, productToken: string): RobotsRules {
  const groups = parseGroups(text)
  const token = productToken.toLowerCase()
  const specific = groups.filter((group) => group.agents.includes(token))
  const matching =
    specific.length > 0
      ? specific
      : groups.filter((group) => group.agents.includes('*'))
  if (matching.length === 0) return ALLOW_EVERYTHING
  return {
    allow: matching.flatMap((group) => group.rules.allow),
    disallow: matching.flatMap((group) => group.rules.disallow),
  }
}

function toRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith('$')
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${body}${anchored ? '$' : ''}`)
}

function longestMatch(patterns: string[], target: string): number {
  return Math.max(
    -1,
    ...patterns
      .filter((pattern) => toRegExp(pattern).test(target))
      .map((pattern) => pattern.length),
  )
}

export function isAllowed(rules: RobotsRules, pathAndQuery: string): boolean {
  return (
    longestMatch(rules.allow, pathAndQuery) >=
    longestMatch(rules.disallow, pathAndQuery)
  )
}

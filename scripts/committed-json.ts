import { readFileSync } from 'node:fs'

export function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'))
}

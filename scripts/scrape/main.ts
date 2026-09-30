import type { Manifest } from '../../src/data/manifest.ts'
import { runBudget } from './budget/budget.ts'
import { runFall } from './fall/fall.ts'
import { runFy } from './fy/fy.ts'
import {
  readManifest,
  type StepResult,
  writeManifest,
} from './manifest-file.ts'
import { runRates } from './rates/rates.ts'
import { runSummary } from './summary.ts'

const STEPS: Record<string, (manifest: Manifest) => Promise<StepResult>> = {
  fall: runFall,
  fy: runFy,
  budget: runBudget,
  rates: runRates,
  summary: runSummary,
}

async function main(requested: string[]): Promise<void> {
  const unknown = requested.filter((name) => !(name in STEPS))
  if (unknown.length > 0) {
    console.error(
      `Unknown dataset: ${unknown.join(', ')}. Choose from: ${Object.keys(STEPS).join(', ')}`,
    )
    process.exitCode = 1
    return
  }
  let manifest = await readManifest()
  const problems: string[] = []
  const selected = Object.entries(STEPS).filter(
    ([name]) => requested.length === 0 || requested.includes(name),
  )
  for (const [name, step] of selected) {
    const result = await step(manifest).catch((error: unknown) => ({
      manifest,
      problems: [String(error)],
    }))
    manifest = result.manifest
    problems.push(...result.problems.map((problem) => `${name}: ${problem}`))
  }
  await writeManifest(manifest)
  for (const problem of problems) console.error(`FAILED ${problem}`)
  process.exitCode = problems.length > 0 ? 1 : 0
}

await main(process.argv.slice(2))

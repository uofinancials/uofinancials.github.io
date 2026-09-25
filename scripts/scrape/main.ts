import type { Manifest } from '../../src/data/manifest.ts'
import { runBudget } from './budget.ts'
import { runFall } from './fall.ts'
import {
  readManifest,
  type StepResult,
  writeManifest,
} from './manifest-file.ts'

const STEPS: Record<string, (manifest: Manifest) => Promise<StepResult>> = {
  fall: runFall,
  budget: runBudget,
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
  for (const name of requested.length > 0 ? requested : Object.keys(STEPS)) {
    const step = STEPS[name]
    if (!step) continue
    const result = await step(manifest)
    manifest = result.manifest
    problems.push(...result.problems.map((problem) => `${name}: ${problem}`))
  }
  await writeManifest(manifest)
  for (const problem of problems) console.error(`FAILED ${problem}`)
  process.exitCode = problems.length > 0 ? 1 : 0
}

await main(process.argv.slice(2))

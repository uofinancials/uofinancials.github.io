const REPAIRS: ReadonlyArray<[damaged: string, repaired: string]> = [
  ['ΓÇÖ', '’'],
  ['ΓÇô', '–'],
  ['├¡', 'í'],
  ['┬á', ' '],
]

const SUSPICIOUS = /[Γ├┬─-╿]/

export function repairMojibake(text: string): string {
  const repaired = REPAIRS.reduce(
    (current, [damaged, fixed]) => current.replaceAll(damaged, fixed),
    text,
  )
  if (SUSPICIOUS.test(repaired)) {
    throw new Error(`unrepaired encoding damage in "${text}"`)
  }
  return repaired
}

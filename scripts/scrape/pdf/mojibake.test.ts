import { expect, test } from 'vitest'
import { repairMojibake } from './mojibake.ts'

test('repairs the known sequences', () => {
  expect(repairMojibake('SapsikΓÇÖwala ΓÇô Ichishk├¡in┬á')).toBe(
    'Sapsik’wala – Ichishkíin ',
  )
})

test('rejects damage it has no repair for', () => {
  expect(() => repairMojibake('Resum├⌐')).toThrow(/unrepaired encoding damage/)
})

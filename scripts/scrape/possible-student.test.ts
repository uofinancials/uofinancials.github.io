import { expect, test } from 'vitest'
import { isPossibleStudent } from './possible-student.ts'

test.each([
  'UO Student Regular',
  'Psychology Doctoral Intern',
  'PreDoc Intrn/Visiting Lecturer',
  'Football Intern',
  'Student Worker',
])('flags %s', (title) => {
  expect(isPossibleStudent([title])).toBe(true)
})

test.each([
  'GE Payroll Specialist',
  'Job & Internship Developer',
  'Director Grad Internship Prgrm',
  "Assist VP Intrn'l Advancement",
  'Student Records Specialist',
  'Internal Auditor',
])('does not flag %s', (title) => {
  expect(isPossibleStudent([title, null])).toBe(false)
})

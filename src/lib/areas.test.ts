import { expect, test } from 'vitest'
import type { BudgetYear } from '@/data/budget'
import type { FallRecord } from '@/data/fall'
import { classifiedJob } from '@/test/fall-records'
import { createAreaAssigner } from './areas'

const ORGS: BudgetYear['orgs'] = {
  '222000': { name: 'Arts & Sciences, College of', level: 3, parent: null },
  '222120': { name: 'CAS Theatre Arts', level: 5, parent: '222000' },
  '470000': { name: 'University Housing', level: 3, parent: null },
  '471000': { name: 'University Housing Ops', level: 5, parent: '470000' },
  '490000': { name: 'University Health Services', level: 3, parent: null },
  '491000': { name: 'University Health Clinic', level: 5, parent: '490000' },
}

function job(code: string | null, name: string): FallRecord {
  return classifiedJob({ payDepartment: { code, name } })
}

test('a published unit or area resolves through the budget hierarchy', () => {
  const assign = createAreaAssigner([], ORGS, 2025)
  expect(assign(job('222120', 'CAS Theatre Arts'))).toEqual({
    area: '222000',
    basis: 'published',
  })
  expect(assign(job('470000', 'University Housing'))).toEqual({
    area: '470000',
    basis: 'published',
  })
})

test('an unpublished code takes the area of its name prefix when the prefix has only one', () => {
  const assign = createAreaAssigner([], ORGS, 2025)
  expect(assign(job('223500', 'CAS Mathematics Operations'))).toEqual({
    area: '222000',
    basis: 'name',
  })
})

test('a prefix learned from census records counts toward its area', () => {
  const records = [job('222120', 'SOMD Music Theatre')]
  expect(
    createAreaAssigner(records, ORGS, 2025)(job('229100', 'SOMD Music')),
  ).toEqual({
    area: '222000',
    basis: 'name',
  })
})

test('a prefix seen under two areas is not used', () => {
  const assign = createAreaAssigner([], ORGS, 2025)
  expect(assign(job('999999', 'University Counseling'))).toEqual({
    area: null,
    basis: 'unassigned',
  })
})

test('a code in the hand table for its census year is assigned by hand', () => {
  const assign = createAreaAssigner([], ORGS, 2025)
  expect(assign(job('267500', 'University Counseling Center'))).toEqual({
    area: '490000',
    basis: 'hand',
  })
  expect(assign(job(null, 'Nowhere Ops'))).toEqual({
    area: null,
    basis: 'unassigned',
  })
})

test("a census outside a hand row's years does not use it", () => {
  expect(
    createAreaAssigner(
      [],
      ORGS,
      2013,
    )(job('267500', 'University Counseling Center')),
  ).toEqual({ area: null, basis: 'unassigned' })
})

import { expect, test } from 'vitest'
import type { BudgetYear } from '@/data/budget'
import type { FallClassified, FallRecord } from '@/data/fall'
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
  const record: FallClassified = {
    kind: 'classified',
    name: 'Doe, Ann',
    jobType: 'Primary',
    jobStatus: 'Active',
    jobStartDate: '2020-01-01',
    jobEndDate: null,
    homeDepartment: { code: null, name: 'Home' },
    payDepartment: { code, name },
    annualSalaryRateCents: 5_000_000,
    apptPercent: 100,
    termOfServiceMonths: 12,
    eeoCategory: 'Secy/Clerical',
    sourcePage: 1,
    possibleStudent: false,
    jobTitle: 'Office Specialist 2',
    positionClass: null,
  }
  return record
}

test('a published unit or area resolves through the budget hierarchy', () => {
  const assign = createAreaAssigner([], ORGS)
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
  const assign = createAreaAssigner([], ORGS)
  expect(assign(job('223500', 'CAS Mathematics Operations'))).toEqual({
    area: '222000',
    basis: 'name',
  })
})

test('a prefix learned from census records counts toward its area', () => {
  const records = [job('222120', 'SOMD Music Theatre')]
  expect(
    createAreaAssigner(records, ORGS)(job('229100', 'SOMD Music')),
  ).toEqual({
    area: '222000',
    basis: 'name',
  })
})

test('a prefix seen under two areas is not used', () => {
  const assign = createAreaAssigner([], ORGS)
  expect(assign(job('999999', 'University Counseling'))).toEqual({
    area: null,
    basis: 'unassigned',
  })
})

test('a code in the hand table is assigned by hand', () => {
  const assign = createAreaAssigner([], ORGS)
  expect(assign(job('267500', 'University Counseling Center'))).toEqual({
    area: '490000',
    basis: 'hand',
  })
  expect(assign(job(null, 'Nowhere Ops'))).toEqual({
    area: null,
    basis: 'unassigned',
  })
})

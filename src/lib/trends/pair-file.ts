import type { BudgetYear } from '../../data/budget.ts'
import { type FallRecord, staffKindSchema } from '../../data/fall.ts'
import type { PayChangesFile } from '../../data/pay-changes.ts'
import { listAreas } from '../census/areas.ts'
import { TREND_GROUPS, type TrendGroup } from '../census/groups.ts'
import { describeCode } from '../departments/codes.ts'
import type { DepartmentCensus } from '../departments/jobs.ts'
import { peerGroupOf } from '../people/peer-group.ts'
import { department } from '../people/person-fields.ts'
import {
  type ContinuingPair,
  changeRatio,
  type PairFilter,
} from './pay-changes.ts'
import { RAISE_ROWS, type RaiseRow } from './raise-groups.ts'
import type { PayChangeNames } from './search.ts'

/** How each pay department, college or VP area, and class or rank reads. */
export type PairNames = Pick<PayChangesFile, 'depts' | 'areas' | 'peers'>

/** Every pay department and class or rank a census publishes and every area of a census's budget year, sorted: a department named by its earliest record published under its own code, or by its code when it has none; a class or rank by its earliest job. */
export function pairNames(
  censuses: DepartmentCensus[],
  budgets: BudgetYear[],
): PairNames {
  const depts = new Map<string, string | null>()
  const peers = new Map<string, string>()
  const note = (record: FallRecord) => {
    const { code, publishedCode } = record.payDepartment
    if (code !== null) {
      const name = publishedCode ? null : department(record.payDepartment)
      depts.set(code, depts.get(code) ?? name)
    }
    const peer = peerGroupOf(record)
    if (peer && !peers.has(peer.key)) peers.set(peer.key, peer.label)
  }
  const sorted = [...censuses].sort((a, b) => a.year - b.year)
  for (const { records } of sorted) records.forEach(note)
  const areas = new Set(
    sorted.flatMap(({ orgs }) => listAreas(orgs).map(({ code }) => code)),
  )
  return {
    depts: [...depts.keys()]
      .sort()
      .map((code) => ({ code, name: depts.get(code) ?? code })),
    areas: [...areas].sort().map((code) => ({
      code,
      name: describeCode(code, censuses, budgets)?.name ?? code,
    })),
    peers: [...peers.keys()]
      .sort()
      .map((key) => ({ key, label: peers.get(key) ?? key })),
  }
}

const KINDS = staffKindSchema.options
const RANKS: PayChangesFile['ranks'] = [
  'same',
  'renamed',
  'changed',
  'unpublished',
]

/** Each value's place in a list; throws for a value the list lacks, which would otherwise be written as no value. */
function placeIn<Value>(list: readonly Value[], what: string) {
  const places = new Map(list.map((value, place) => [value, place]))
  return (value: Value): number => {
    const place = places.get(value)
    if (place === undefined) {
      throw new Error(`The pay changes file lists no ${what} "${value}"`)
    }
    return place
  }
}

function orNull<Value>(place: (value: Value) => number) {
  return (value: Value | null) => (value === null ? null : place(value))
}

type Columns = PayChangesFile['pairs']
type Row = { [Column in keyof Columns]: Columns[Column][number] }

/** The order rows are sorted by, so the file's text does not follow the order of names in a census. */
const SORT_ORDER: (keyof Row)[] = [
  'fromYear',
  'kind',
  'dept',
  'area',
  'group',
  'category',
  'peer',
  'raise',
  'fromCents',
  'toCents',
  'isClassChanged',
  'rank',
  'isTitleChanged',
]

const NO_VALUE = -1

function compareRows(a: Row, b: Row): number {
  for (const column of SORT_ORDER) {
    const difference =
      Number(a[column] ?? NO_VALUE) - Number(b[column] ?? NO_VALUE)
    if (difference !== 0) return difference
  }
  return 0
}

function toRows(
  pairs: ContinuingPair[],
  { depts, areas, peers }: PairNames,
  categories: string[],
): Row[] {
  const kind = placeIn(KINDS, 'staff kind')
  const dept = orNull(
    placeIn(
      depts.map(({ code }) => code),
      'pay department',
    ),
  )
  const area = orNull(
    placeIn(
      areas.map(({ code }) => code),
      'area',
    ),
  )
  const group = placeIn(TREND_GROUPS, 'group')
  const category = orNull(placeIn(categories, 'EEO category'))
  const peer = orNull(
    placeIn(
      peers.map(({ key }) => key),
      'class or rank',
    ),
  )
  const raise = orNull(placeIn(RAISE_ROWS, 'raise row'))
  const rank = orNull(placeIn(RANKS, 'rank change'))
  return pairs.map((pair) => ({
    fromYear: pair.fromYear,
    kind: kind(pair.kind),
    dept: dept(pair.dept),
    area: area(pair.area),
    group: group(pair.group),
    category: category(pair.eeoCategory),
    peer: peer(pair.peer),
    raise: raise(pair.raise),
    fromCents: pair.fromCents,
    toCents: pair.toCents,
    isClassChanged: pair.isClassChanged,
    rank: rank(pair.rank),
    isTitleChanged: pair.isTitleChanged,
  }))
}

/** The pairs as the pay changes file holds them: one column per field, the rows sorted by every field. */
export function encodePairs(
  pairs: ContinuingPair[],
  names: PairNames,
): PayChangesFile {
  const categories = [
    ...new Set(pairs.flatMap(({ eeoCategory }) => eeoCategory ?? [])),
  ].sort()
  const rows = toRows(pairs, names, categories).sort(compareRows)
  const column = <Column extends keyof Row>(key: Column) =>
    rows.map((row) => row[key])
  return {
    ...names,
    kinds: [...KINDS],
    groups: [...TREND_GROUPS],
    categories,
    raises: RAISE_ROWS.map(({ label }) => label),
    ranks: RANKS,
    pairs: {
      fromYear: column('fromYear'),
      kind: column('kind'),
      dept: column('dept'),
      area: column('area'),
      group: column('group'),
      category: column('category'),
      peer: column('peer'),
      raise: column('raise'),
      fromCents: column('fromCents'),
      toCents: column('toCents'),
      isClassChanged: column('isClassChanged'),
      rank: column('rank'),
      isTitleChanged: column('isTitleChanged'),
    },
  }
}

function cell<Value>(cells: readonly Value[], place: number): Value {
  const value = cells[place]
  if (value === undefined) {
    throw new Error(`The pay changes file has no entry ${place}`)
  }
  return value
}

function listed<Value>(
  list: readonly Value[],
  place: number | null,
): Value | null {
  return place === null ? null : cell(list, place)
}

function groupNamed(name: string): TrendGroup {
  const group = TREND_GROUPS.find((known) => known === name)
  if (!group) throw new Error(`The pay changes file names no group "${name}"`)
  return group
}

function raiseRowLabelled(label: string): RaiseRow {
  const row = RAISE_ROWS.find((known) => known.label === label)
  if (!row)
    throw new Error(`The pay changes file names no raise row "${label}"`)
  return row
}

/** The pairs the file holds; throws on a group or raise row the site does not know. */
export function decodePairs(file: PayChangesFile): ContinuingPair[] {
  const groups = file.groups.map(groupNamed)
  const raises = file.raises.map(raiseRowLabelled)
  const { pairs } = file
  return pairs.fromYear.map((fromYear, row) => {
    const fromCents = cell(pairs.fromCents, row)
    const toCents = cell(pairs.toCents, row)
    return {
      fromYear,
      kind: cell(file.kinds, cell(pairs.kind, row)),
      dept: listed(file.depts, cell(pairs.dept, row))?.code ?? null,
      area: listed(file.areas, cell(pairs.area, row))?.code ?? null,
      group: cell(groups, cell(pairs.group, row)),
      eeoCategory: listed(file.categories, cell(pairs.category, row)),
      peer: listed(file.peers, cell(pairs.peer, row))?.key ?? null,
      raise: listed(raises, cell(pairs.raise, row)),
      fromCents,
      toCents,
      ratio: changeRatio(fromCents, toCents),
      isClassChanged: cell(pairs.isClassChanged, row),
      rank: listed(file.ranks, cell(pairs.rank, row)),
      isTitleChanged: cell(pairs.isTitleChanged, row),
    }
  })
}

/** How a filter's pay department, area, and class or rank read: as the file lists each, or as given when it lists none; `null` for one not set. */
export function pairFilterNames(
  { depts, areas, peers }: PairNames,
  { dept, area, position }: Pick<PairFilter, 'dept' | 'area' | 'position'>,
): PayChangeNames {
  const read = (
    asked: string | null,
    name: (asked: string) => string | undefined,
  ) => (asked === null ? null : (name(asked) ?? asked))
  return {
    dept: read(dept, (asked) => depts.find(({ code }) => code === asked)?.name),
    area: read(area, (asked) => areas.find(({ code }) => code === asked)?.name),
    position: read(
      position,
      (asked) => peers.find(({ key }) => key === asked)?.label,
    ),
  }
}

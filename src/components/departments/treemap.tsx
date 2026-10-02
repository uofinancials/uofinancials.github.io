import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { RadioField } from '@/components/fields/radio-field'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { fiscalYearLabel } from '@/data/budget'
import type { DepartmentRow } from '@/lib/departments/table'
import {
  departmentTiles,
  SIZE_MEASURES,
  SIZE_NOUNS,
  type SizeMeasure,
  type Tile,
  type TileDirection,
  tileSummary,
  tileText,
} from '@/lib/departments/tiles'
import { formatCount } from '@/lib/shared/format'
import { treemapFractions } from '@/lib/shared/treemap'
import { cn, widthOf } from '@/lib/utils'

/** The proportions the tiles are laid out in, and the classes that give a box those proportions: wide from the `md` breakpoint, tall below it. */
const BOXES = [
  { width: 12, height: 5, className: 'hidden aspect-[12/5] md:block' },
  { width: 3, height: 4, className: 'aspect-[3/4] md:hidden' },
]

const FILLS: Record<TileDirection, string> = {
  rose: 'bg-tile-rose',
  fell: 'bg-tile-fell',
  flat: 'bg-tile-flat',
}

type TableYear = { year: number; fiscalYear: number }
type Area = { code: string; name: string }

/** Each measure's year, as the table's columns have it: the budget's fiscal year, or the census. */
function yearsOf({ year, fiscalYear }: TableYear): Record<SizeMeasure, string> {
  const census = `Fall ${year}`
  return { budget: fiscalYearLabel(fiscalYear), spend: census, jobs: census }
}

const TILE_CLASS =
  'block size-full rounded-sm text-xs leading-tight text-foreground no-underline hover:outline-2 hover:-outline-offset-2 hover:outline-foreground/50 focus-visible:relative focus-visible:z-10'

/** A tile's face: an area's leads to its units, a unit's to its page, and one with no code leads nowhere. */
function TileFace({
  tile,
  area,
  label,
  children,
  ...trigger
}: {
  tile: Tile
  area: Area | null
  label: string
  children: ReactNode
}) {
  const face = { 'aria-label': label, ...trigger }
  const className = cn(TILE_CLASS, FILLS[tile.direction])
  const { code } = tile
  if (code === null) {
    return (
      <span role="img" {...face} className={className}>
        {children}
      </span>
    )
  }
  if (area) {
    return (
      <Link
        to="/departments/$code"
        params={{ code }}
        {...face}
        className={className}
      >
        {children}
      </Link>
    )
  }
  return (
    <Link
      from="/departments"
      to="/departments"
      search={(previous) => ({ ...previous, level: 'units', area: code })}
      resetScroll={false}
      {...face}
      className={className}
    >
      {children}
    </Link>
  )
}

/** A tile's figures in full, the exact figure first. */
function TileDetail({
  tile,
  measure,
  since,
}: {
  tile: Tile
  measure: SizeMeasure
  since: string
}) {
  const { exact, share, change } = tileText(tile, measure)
  const noun = SIZE_NOUNS[measure]
  return (
    <>
      <span className="block text-sm font-semibold">
        {measure === 'jobs' ? `${exact} jobs` : exact}
      </span>
      <span className="block">{tile.name}</span>
      <span className="block">
        {share} of the {noun} drawn
      </span>
      {change && (
        <span className="block">
          {change} from {since}
        </span>
      )}
    </>
  )
}

function Legend({ since }: { since: string }) {
  const entries: [TileDirection, string][] = [
    ['rose', `Rose from ${since}`],
    ['fell', 'Fell'],
    ['flat', 'Unchanged, or no comparison'],
  ]
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {entries.map(([direction, text]) => (
        <li key={direction} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn('size-3 rounded-sm', FILLS[direction])}
          />
          {text}
        </li>
      ))}
    </ul>
  )
}

/** One box of tiles, each placed and sized as a share of the box; a tile shows as much of its name, figure, and change as it has room for. */
function TileList({
  tiles,
  box,
  className,
  title,
  area,
  measure,
  since,
}: {
  tiles: Tile[]
  box: { width: number; height: number }
  className: string
  title: string
  area: Area | null
  measure: SizeMeasure
  since: string
}) {
  const rects = treemapFractions(
    tiles.map(({ value }) => value),
    box,
  )
  return (
    <ul aria-label={title} className={cn('relative w-full', className)}>
      {tiles.map((tile, index) => {
        const rect = rects[index]
        if (!rect) return null
        const { short, change } = tileText(tile, measure)
        return (
          <li
            key={tile.code ?? 'unassigned'}
            className="@container-size absolute max-w-none p-px"
            style={{
              left: widthOf(rect.x),
              top: widthOf(rect.y),
              width: widthOf(rect.width),
              height: widthOf(rect.height),
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <TileFace
                  tile={tile}
                  area={area}
                  label={tileSummary(tile, measure, since)}
                >
                  <span className="hidden flex-col p-1.5 tile-name:flex">
                    <span className="truncate font-medium tile-change:line-clamp-2 tile-change:whitespace-normal">
                      {tile.name}
                    </span>
                    <span className="hidden tile-figure:block">{short}</span>
                    {change && (
                      <span className="hidden tile-change:block">{change}</span>
                    )}
                  </span>
                </TileFace>
              </TooltipTrigger>
              <TooltipContent>
                <TileDetail tile={tile} measure={measure} since={since} />
              </TooltipContent>
            </Tooltip>
          </li>
        )
      })}
    </ul>
  )
}

function NotDrawn({
  count,
  kind,
  noun,
}: {
  count: number
  kind: string
  noun: string
}) {
  const isOne = count === 1
  return (
    <p className="text-sm text-muted-foreground">
      {formatCount(count)} {isOne ? kind : `${kind}s`} with no {noun} above zero{' '}
      {isOne ? 'is' : 'are'} not drawn; the table lists {isOne ? 'it' : 'them'}.
    </p>
  )
}

function Heading({ title, area }: { title: string; area: Area | null }) {
  return (
    <div className="space-y-1">
      {area && (
        <Link
          from="/departments"
          to="/departments"
          search={(previous) => ({
            ...previous,
            level: undefined,
            area: undefined,
          })}
          resetScroll={false}
          className="link text-sm"
        >
          All areas
        </Link>
      )}
      <h2 className="text-section">{title}</h2>
    </div>
  )
}

/** The rows as a treemap: a tile per row with a figure above zero, sized by the measure and colored by its change, under a switch for the measure. */
export function DepartmentTreemap({
  rows,
  area,
  measure,
  now,
  before,
  onMeasure,
}: {
  rows: DepartmentRow[]
  /** The area whose units the rows are; `null` when they are the areas. */
  area: Area | null
  measure: SizeMeasure
  now: TableYear
  before: TableYear
  onMeasure: (measure: SizeMeasure) => void
}) {
  const { tiles, notDrawn } = departmentTiles(rows, measure)
  const years = yearsOf(now)
  const since = yearsOf(before)[measure]
  const noun = SIZE_NOUNS[measure]
  const kind = area ? 'unit' : 'area'
  const title = `${years[measure]} ${noun} by ${area ? `unit in ${area.name}` : 'college and VP area'}`
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <Heading title={title} area={area} />
        <RadioField
          legend="Size by"
          name="measure"
          value={measure}
          options={SIZE_MEASURES.map((option) => [
            option,
            `${years[option]} ${SIZE_NOUNS[option]}`,
          ])}
          onSelect={onMeasure}
        />
      </div>
      {tiles.length === 0 ? (
        <p>
          No {kind} here has {noun} above zero to draw.
        </p>
      ) : (
        <>
          <Legend since={since} />
          <TooltipProvider>
            {BOXES.map(({ className, ...box }) => (
              <TileList
                key={className}
                tiles={tiles}
                box={box}
                className={className}
                title={title}
                area={area}
                measure={measure}
                since={since}
              />
            ))}
          </TooltipProvider>
          {notDrawn > 0 && (
            <NotDrawn count={notDrawn} kind={kind} noun={noun} />
          )}
        </>
      )}
    </section>
  )
}

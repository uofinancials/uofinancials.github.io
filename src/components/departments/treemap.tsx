import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { RadioField } from '@/components/fields/radio-field'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { TableYear } from '@/data/summary'
import { useIsWide } from '@/hooks/use-is-wide'
import {
  SIZE_MEASURES,
  SIZE_NOUNS,
  type SizeMeasure,
  sizeLabels,
  sizeYears,
} from '@/lib/departments/measures'
import type { DepartmentRow } from '@/lib/departments/table'
import {
  departmentTiles,
  notDrawnNote,
  type Tile,
  type TileDirection,
  tileText,
} from '@/lib/departments/tiles'
import { type Box, treemapFractions } from '@/lib/shared/treemap'
import { cn, widthOf } from '@/lib/utils'

/** The proportions the tiles are laid out in, with the class that gives the box them: wide from the `md` breakpoint, tall below it. */
const WIDE = { width: 12, height: 5, className: 'aspect-[12/5]' }
const TALL = { width: 3, height: 4, className: 'aspect-[3/4]' }

const FILLS: Record<TileDirection, string> = {
  rose: 'bg-tile-rose',
  fell: 'bg-tile-fell',
  flat: 'bg-tile-flat',
}

type Area = NonNullable<DepartmentRow['area']>

/** A tile's face: an area's leads to its units, a unit's to its page, and one with no code leads nowhere. Whatever else it is given, the tooltip trigger's handlers, goes on its element. */
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
  const className = cn(
    'block size-full rounded-sm text-xs leading-tight text-foreground no-underline hover:outline-2 hover:-outline-offset-2 hover:outline-foreground/50 focus-visible:relative focus-visible:z-10',
    FILLS[tile.direction],
  )
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

/** The tiles in one box, each placed and sized as a share of it; a tile shows as much of its name, figure, and change as it has room for, and all of them in its tooltip. */
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
  box: Box
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
        const text = tileText(tile, measure, since)
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
                <TileFace tile={tile} area={area} label={text.summary}>
                  <span className="hidden flex-col p-1.5 tile-name:flex">
                    <span className="truncate font-medium tile-change:line-clamp-2 tile-change:whitespace-normal">
                      {tile.name}
                    </span>
                    <span className="hidden tile-figure:block">
                      {text.short}
                    </span>
                    {text.change && (
                      <span className="hidden tile-change:block">
                        {text.change}
                      </span>
                    )}
                  </span>
                </TileFace>
              </TooltipTrigger>
              <TooltipContent>
                <span className="block text-sm font-semibold">
                  {text.figure}
                </span>
                <span className="block">{tile.name}</span>
                <span className="block">{text.share}</span>
                {text.changed && <span className="block">{text.changed}</span>}
              </TooltipContent>
            </Tooltip>
          </li>
        )
      })}
    </ul>
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
  const { className, ...box } = useIsWide() ? WIDE : TALL
  const { tiles, notDrawn } = departmentTiles(rows, measure)
  const labels = sizeLabels(now)
  const since = sizeYears(before)[measure]
  const kind = area ? 'unit' : 'area'
  const title = `${labels[measure]} by ${area ? `unit in ${area.name}` : 'college and VP area'}`
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <Heading title={title} area={area} />
        <RadioField
          legend="Size by"
          name="measure"
          value={measure}
          options={SIZE_MEASURES.map((option) => [option, labels[option]])}
          onSelect={onMeasure}
        />
      </div>
      {tiles.length === 0 ? (
        <p>
          No {kind} here has {SIZE_NOUNS[measure]} above zero to draw.
        </p>
      ) : (
        <>
          <Legend since={since} />
          <TooltipProvider>
            <TileList
              tiles={tiles}
              box={box}
              className={className}
              title={title}
              area={area}
              measure={measure}
              since={since}
            />
          </TooltipProvider>
          {notDrawn > 0 && (
            <p className="text-sm text-muted-foreground">
              {notDrawnNote(notDrawn, kind, measure)}
            </p>
          )}
        </>
      )}
    </section>
  )
}

import { cn } from 'cn'
import type * as React from 'react'

/** A table with row headers keeps its first column in view as its numbers scroll sideways, on a paper fill under the row's tint; on a phone that column wraps and carries a hairline. */
const KEY_COLUMN =
  'key-cell:sticky key-cell:left-0 key-cell:z-[1] key-cell:bg-background key-cell:bg-[linear-gradient(var(--row-tint),var(--row-tint))] max-md:key-cell:min-w-28 max-md:key-cell:whitespace-normal max-md:key-cell:shadow-[inset_-1px_0_var(--border)]'

/** Column headers stay at the top of a table whose container is capped in height, on the same paper fill; their hairline is drawn on the cells, since the row's own border would stay behind, and the corner stays above both sticky sets. */
const STICKY_HEADER =
  'head-cell:sticky head-cell:top-0 head-cell:z-[1] head-cell:bg-background head-cell:bg-[linear-gradient(var(--row-tint),var(--row-tint))] head-cell:after:absolute head-cell:after:inset-x-0 head-cell:after:top-full head-cell:after:h-px head-cell:after:bg-border [&_thead_tr]:border-transparent corner-cell:z-[2]'

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<'table'> & {
  /** Classes for the scrolling container, such as a height cap. */
  containerClassName?: string
}) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        'scroll-edge relative w-full overflow-x-auto',
        containerClassName,
      )}
    >
      <table
        data-slot="table"
        className={cn(
          `w-full caption-bottom text-sm ${KEY_COLUMN} ${STICKY_HEADER}`,
          className,
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t [--row-tint:var(--row-hover)] font-medium [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b bg-(--row-tint) transition-colors hover:[--row-tint:var(--row-hover)] has-aria-expanded:[--row-tint:var(--row-hover)] data-[state=selected]:[--row-tint:var(--muted)]',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'h-10 p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn(
        'mb-2 caption-top text-left text-sm font-medium text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
}

import { cn } from 'cn'
import type * as React from 'react'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="scroll-edge relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

/** A row's tint, drawn by the row and layered over the paper of its sticky first cell. */
const ROW_TINT = 'bg-(--row-tint)'

/** The first cell stays in view as the numbers scroll sideways; on a phone it wraps and carries a hairline. */
const KEY_CELL =
  'first:sticky first:left-0 first:z-[1] first:bg-background first:bg-[linear-gradient(var(--row-tint),var(--row-tint))] max-md:first:min-w-28 max-md:first:whitespace-normal max-md:first:shadow-[inset_-1px_0_var(--border)]'

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
        'border-t [--row-tint:color-mix(in_oklab,var(--muted)_50%,transparent)] font-medium [&>tr]:last:border-b-0',
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
        `border-b transition-colors ${ROW_TINT} hover:[--row-tint:color-mix(in_oklab,var(--muted)_50%,transparent)] has-aria-expanded:[--row-tint:color-mix(in_oklab,var(--muted)_50%,transparent)] data-[state=selected]:[--row-tint:var(--muted)]`,
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
        `h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] ${KEY_CELL}`,
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
        `h-10 p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] ${KEY_CELL}`,
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

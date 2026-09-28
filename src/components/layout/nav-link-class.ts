/** A navigation or tab link, the one marked `aria-current="page"` underlined in the accent. */
export const NAV_LINK_CLASS =
  'text-muted-foreground underline-offset-8 hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2'

/** A tab drawn as a navigation link, sized to sit on its row's hairline. */
export const TAB_LINK_CLASS = `block px-3 py-2 ${NAV_LINK_CLASS}`

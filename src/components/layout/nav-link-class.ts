/** A navigation or tab link, the one marked `aria-current="page"` underlined in the accent. */
export const NAV_LINK_CLASS =
  'text-muted-foreground underline-offset-8 hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2'

/** A tab drawn as a navigation link, sized to sit on its row's hairline. */
export const TAB_LINK_CLASS = `block py-2 text-sm ${NAV_LINK_CLASS}`

/** A row that scrolls sideways on a phone, bleeding to the screen's edges with the scroll edge shadow, and sits in the column from `md`. */
export const SCROLL_ROW_CLASS =
  'scroll-edge -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0'

/** A row of tabs on a hairline, spaced so the first tab's text lines up with the page's edge. */
export const TAB_LIST_CLASS = 'flex flex-wrap gap-x-5 border-b'

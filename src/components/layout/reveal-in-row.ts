function reveal(item: HTMLElement) {
  const row = item.closest('ul')
  if (!row) return
  const { paddingLeft, paddingRight } = getComputedStyle(row)
  const box = row.getBoundingClientRect()
  const start = box.left + (Number.parseFloat(paddingLeft) || 0)
  const end = box.right - (Number.parseFloat(paddingRight) || 0)
  const { left, right } = item.getBoundingClientRect()
  if (left < start) row.scrollLeft -= start - left
  else if (right > end) row.scrollLeft += right - end
}

/**
 * A ref for the current item of a row that scrolls sideways: scrolls the row
 * just far enough to show the item in full, clear of the row's padding, and
 * again once the web font has loaded, since the swap moves the item.
 */
export function revealInRow(item: HTMLElement | null) {
  if (!item) return
  reveal(item)
  document.fonts?.ready.then(() => {
    if (item.closest('[aria-current="page"]')) reveal(item)
  })
}

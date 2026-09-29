import { BUTTON_CLASS } from '@/components/fields/button-class'

/** A filter set by a link, shown with a button that removes it. */
export function RemovableFilter({
  text,
  onRemove,
}: {
  text: string
  onRemove: () => void
}) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      {text}
      <button type="button" className={BUTTON_CLASS} onClick={onRemove}>
        Remove
      </button>
    </p>
  )
}

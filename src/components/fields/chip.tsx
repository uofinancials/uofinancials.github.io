import { CLEAR_BUTTON_CLASS } from '@/components/fields/button-class'

/** A fully round label with a × that removes what it names. */
export function Chip({
  text,
  onRemove,
}: {
  text: string
  onRemove: () => void
}) {
  return (
    <span className="flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-sm">
      {text}
      <button
        type="button"
        aria-label={`Remove ${text}`}
        className={CLEAR_BUTTON_CLASS}
        onClick={onRemove}
      >
        ×
      </button>
    </span>
  )
}

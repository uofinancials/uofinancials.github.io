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
      <button
        type="button"
        className="rounded-md border px-2 py-0.5"
        onClick={onRemove}
      >
        Remove
      </button>
    </p>
  )
}

export function SearchField({
  label,
  value,
  onSearch,
}: {
  label: string
  value: string
  onSearch: (value: string | undefined) => void
}) {
  return (
    <label className="flex max-w-sm flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="search"
        className="rounded-md border bg-background px-2 py-1"
        value={value}
        onChange={(event) => onSearch(event.target.value || undefined)}
      />
    </label>
  )
}

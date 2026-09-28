import { SelectField } from './select-field'

export function YearRangeFields({
  years,
  from,
  to,
  onChange,
}: {
  years: number[]
  from: number
  to: number
  onChange: (patch: { from?: number; to?: number }) => void
}) {
  const options = years.map((year): [string, string] => [
    String(year),
    `Fall ${year}`,
  ])
  return (
    <>
      <SelectField
        label="From"
        value={String(from)}
        options={options}
        onSelect={(value) => onChange({ from: Number(value) })}
      />
      <SelectField
        label="To"
        value={String(to)}
        options={options}
        onSelect={(value) => onChange({ to: Number(value) })}
      />
    </>
  )
}

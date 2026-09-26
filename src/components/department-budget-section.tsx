import { RadioField } from '@/components/radio-field'
import { SeriesChart } from '@/components/series-chart'
import { SourceCitation } from '@/components/source-citation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { BudgetBreakdown, DepartmentBudget } from '@/lib/department-budget'
import { budgetYearLabel } from '@/lib/department-search'
import {
  formatCompactDollars,
  formatDollars,
  formatOrBlank,
} from '@/lib/format'
import { cn, NUMBER_CELL } from '@/lib/utils'

const BREAKDOWN_OPTIONS = [
  ['account', 'Account group'],
  ['fund', 'Fund type'],
] as const
const BUDGET_NOTE =
  'Figures are UO’s Total Expenditure Budget as published: a plan, not spending. They include budget reserves, internal sales reimbursements, and transfers, and exclude sponsored research, plant, loan, and agency funds.'
const COMPUTED =
  'each figure sums the published rows for the unit, or for every unit the area lists that year, over funds and posting periods. Account groups are this site’s grouping of UO’s account types; the table lists the types in each.'

type BudgetTableRow = {
  key: string
  label: string
  values: (number | null)[]
  isGroup: boolean
}

/** Account view: each group's row, then its account types; fund view: each fund type. */
function tableRows(
  budget: DepartmentBudget,
  breakdown: BudgetBreakdown,
): BudgetTableRow[] {
  if (breakdown === 'fund') {
    return budget.series.map(({ key, values }) => ({
      key,
      label: key,
      values,
      isGroup: false,
    }))
  }
  return budget.series.flatMap(({ key, values }) => [
    { key, label: key, values, isGroup: true },
    ...budget.accountTypes
      .filter(({ group }) => group === key)
      .map(({ accountType, name, values: typeValues }) => ({
        key: accountType,
        label: `${accountType} ${name}`,
        values: typeValues,
        isGroup: false,
      })),
  ])
}

function BudgetTable({
  budget,
  breakdown,
}: {
  budget: DepartmentBudget
  breakdown: BudgetBreakdown
}) {
  const labels = budget.years.map(budgetYearLabel)
  const rows = [
    ...tableRows(budget, breakdown),
    { key: 'total', label: 'Total', values: budget.total, isGroup: true },
  ]
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">
            {breakdown === 'account' ? 'Account type' : 'Fund type'}
          </TableHead>
          {labels.map((label) => (
            <TableHead key={label} scope="col" className="text-right">
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ key, label, values, isGroup }) => (
          <TableRow key={key}>
            <TableHead
              scope="row"
              className={cn(!isGroup && 'pl-6 font-normal')}
            >
              {label}
            </TableHead>
            {labels.map((yearLabel, index) => (
              <TableCell
                key={yearLabel}
                className={cn(NUMBER_CELL, isGroup && 'font-medium')}
              >
                {formatOrBlank(values[index], formatDollars)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** A department's budget by account group or fund type over the fiscal years, with its table and caption. */
export function DepartmentBudgetSection({
  budget,
  breakdown,
  onBreakdown,
}: {
  budget: DepartmentBudget
  breakdown: BudgetBreakdown
  onBreakdown: (breakdown: BudgetBreakdown) => void
}) {
  const first = budget.years[0]
  const last = budget.years.at(-1)
  const title = `Budget by ${breakdown === 'account' ? 'account group' : 'fund type'}`
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{BUDGET_NOTE}</p>
      <RadioField
        legend="Break down by"
        name="budget"
        value={breakdown}
        options={BREAKDOWN_OPTIONS}
        onSelect={onBreakdown}
      />
      <SeriesChart
        labels={budget.years.map(budgetYearLabel)}
        series={budget.series}
        format={formatDollars}
        formatAxis={formatCompactDollars}
        label={title}
      />
      <BudgetTable budget={budget} breakdown={breakdown} />
      {first && last && (
        <SourceCitation
          source={{
            kind: 'budget-range',
            from: first.fiscalYear,
            to: last.fiscalYear,
          }}
          computed={COMPUTED}
        />
      )}
    </section>
  )
}

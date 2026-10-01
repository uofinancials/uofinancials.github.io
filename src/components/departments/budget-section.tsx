import { memo } from 'react'
import { SeriesChart } from '@/components/charts/series-chart'
import { RadioField } from '@/components/fields/radio-field'
import { PageSection } from '@/components/layout/page-section'
import { Sources } from '@/components/layout/sources'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DepartmentFileBudget } from '@/data/department'
import type { BudgetBreakdown } from '@/lib/departments/budget'
import { budgetYearLabel, budgetYearTick } from '@/lib/departments/search'
import {
  formatCompactDollars,
  formatDollars,
  formatOrBlank,
} from '@/lib/shared/format'
import { cn, NUMBER_CELL, WRAP_CELL } from '@/lib/utils'

const BREAKDOWN_OPTIONS = [
  ['account', 'Account group'],
  ['fund', 'Fund type'],
] as const
const BUDGET_NOTE =
  'Figures are UO’s Total Expenditure Budget as published: a plan, not spending. They include budget reserves, internal sales reimbursements, and transfers, and exclude sponsored research, plant, loan, and agency funds.'
const COMPUTED =
  'each figure sums the published rows for the unit, or for every unit the area lists that year, over funds and posting periods. Account groups are this site’s grouping of UO’s account types; the table lists the types in each.'

const PANELS_NOTE =
  'One chart per line, each on its own scale; the table below has the figures.'

/** One small chart per budget line, each on its own scale, so a small line is not flattened by a large one. */
const BudgetPanels = memo(function BudgetPanels({
  years,
  series,
  title,
}: {
  years: DepartmentFileBudget['years']
  series: DepartmentFileBudget['series'][BudgetBreakdown]
  title: string
}) {
  const labels = years.map(budgetYearTick)
  return (
    <>
      <p className="text-sm text-muted-foreground">{PANELS_NOTE}</p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {series.map((line) => (
          <div key={line.key} className="space-y-1">
            <h3 className="text-sm font-medium">{line.key}</h3>
            <SeriesChart
              labels={labels}
              series={[line]}
              format={formatDollars}
              formatAxis={formatCompactDollars}
              label={`${title}: ${line.key}`}
              className="h-48"
            />
          </div>
        ))}
      </div>
    </>
  )
})

type BudgetTableRow = {
  key: string
  label: string
  values: (number | null)[]
  isGroup: boolean
}

/** Account view: each group's row, then its account types; fund view: each fund type. */
function tableRows(
  budget: DepartmentFileBudget,
  breakdown: BudgetBreakdown,
): BudgetTableRow[] {
  if (breakdown === 'fund') {
    return budget.series.fund.map(({ key, values }) => ({
      key,
      label: key,
      values,
      isGroup: false,
    }))
  }
  return budget.series.account.flatMap(({ key, values }) => [
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
  budget: DepartmentFileBudget
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
              className={cn(WRAP_CELL, !isGroup && 'pl-6 font-normal')}
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
  budget: DepartmentFileBudget
  breakdown: BudgetBreakdown
  onBreakdown: (breakdown: BudgetBreakdown) => void
}) {
  const first = budget.years[0]
  const last = budget.years.at(-1)
  const title = `Budget by ${breakdown === 'account' ? 'account group' : 'fund type'}`
  return (
    <PageSection title={title}>
      <p className="text-sm text-muted-foreground">{BUDGET_NOTE}</p>
      <RadioField
        legend="Break down by"
        name="budget"
        value={breakdown}
        options={BREAKDOWN_OPTIONS}
        onSelect={onBreakdown}
      />
      <BudgetPanels
        years={budget.years}
        series={budget.series[breakdown]}
        title={title}
      />
      <BudgetTable budget={budget} breakdown={breakdown} />
      {first && last && (
        <Sources
          sources={[
            {
              kind: 'budget-range',
              from: first.fiscalYear,
              to: last.fiscalYear,
              computed: COMPUTED,
            },
          ]}
        />
      )}
    </PageSection>
  )
}

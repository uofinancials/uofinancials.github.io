import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  EXEC_OTHER_CATEGORY,
  EXECUTIVE_GRADE,
  publishedCategoriesOf,
  TREND_GROUPS,
  type TrendGroup,
} from '@/lib/census/groups'

const GROUP_RULES: Partial<Record<TrendGroup, string>> = {
  Executives: `Unclassified jobs in the categories ${publishedCategoriesOf('Executives').join(', ')}, or with the OA salary grade ${EXECUTIVE_GRADE} whatever their category, a grade UO publishes from Fall 2016. Opened, the jobs placed by the grade alone are one line, “${EXEC_OTHER_CATEGORY}”.`,
  'Admins and professionals': `Unclassified jobs in the categories ${publishedCategoriesOf('Admins and professionals').join(', ')}, without the ${EXECUTIVE_GRADE} grade.`,
  'Classified temporaries':
    'Classified jobs with a TS position class, or none (Fall 2015). Their published rates are annualised hourly rates, so their spend and FTE come from their actual pay in the FY total pay reports, from Fall 2020.',
  Overloads:
    'Jobs of type Overload, in every year. UO publishes an Overload category from 2019; before, overloads carried the holder’s category.',
  'Classified staff': 'Every other classified job, whatever its category.',
  'Category not published': `Unclassified jobs with no category and no ${EXECUTIVE_GRADE} grade (Fall 2017).`,
}

/** Each group and the published categories, grades, and job types in it. */
export function GroupMapping() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Group</TableHead>
          <TableHead scope="col">Jobs in it</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {TREND_GROUPS.map((group) => (
          <TableRow key={group}>
            <TableHead scope="row" className="font-normal">
              {group}
            </TableHead>
            <TableCell className="whitespace-normal">
              {GROUP_RULES[group] ??
                `Unclassified jobs in the categories ${publishedCategoriesOf(group).join(', ')}.`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

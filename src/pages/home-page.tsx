import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function HomePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>UO Financials</h1>
        </CardTitle>
        <CardDescription>
          An independent look at University of Oregon pay and budgets
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

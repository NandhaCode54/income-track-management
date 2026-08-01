import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/common/EmptyState';
import { ROUTES } from '@/constants/routes';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDate } from '@/utils/formatDate';
import type { TopExpenses } from '@/types/dashboard.types';

interface TopExpensesCardProps {
  data?: TopExpenses;
  isLoading: boolean;
  periodLabel: string;
}

/**
 * The biggest single entries of the month.
 *
 * Deliberately separate from the category chart beside it: "Food & Dining is your
 * largest category" and "one dinner cost ₹8,000" are different findings, and the
 * second is usually the one somebody can act on.
 */
const TopExpensesCard = ({ data, isLoading, periodLabel }: TopExpensesCardProps) => {
  const { format } = useCurrency();
  const expenses = data?.largest ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Largest expenses</CardTitle>
        <CardDescription>The biggest single entries in {periodLabel}.</CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-11 animate-pulse rounded-lg bg-muted/40" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={`No expenses in ${periodLabel}`}
            description="Record what the family spent and the largest entries surface here."
            action={
              <Button asChild variant="outline">
                <Link to={ROUTES.EXPENSES}>Add an expense</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-baseline justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{expense.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(expense.date)}
                    {expense.categoryName ? ` · ${expense.categoryName}` : ''}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{format(expense.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default TopExpensesCard;

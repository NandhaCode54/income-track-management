import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDate } from '@/utils/formatDate';
import { NEUTRAL_CATEGORY_COLOR } from './expense.constants';
import type { ExpenseBreakdown, TopExpense } from '@/types/expense.types';

interface BreakdownCardProps {
  title: string;
  description: string;
  rows: ExpenseBreakdown[];
  emptyLabel: string;
  /** Categories carry their own colour; everything else shares one hue. */
  useRowColor?: boolean;
}

/**
 * A ranked magnitude list, not a categorical chart: every row measures the same
 * thing, so rank carries the comparison. Each row states its name, amount and
 * share in text, so nothing is encoded by colour alone.
 */
const BreakdownCard = ({
  title,
  description,
  rows,
  emptyLabel,
  useRowColor = false,
}: BreakdownCardProps) => {
  const { format } = useCurrency();
  const largest = rows[0]?.total ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li key={row.key} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{row.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {format(row.total)}
                    <span className="ml-2 text-muted-foreground">{row.percentage}%</span>
                  </span>
                </div>
                {/* Scaled against the leader so the top row always fills the track. */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-rose-500 dark:bg-rose-400"
                    style={{
                      width: `${largest === 0 ? 0 : (row.total / largest) * 100}%`,
                      ...(useRowColor
                        ? { backgroundColor: row.color ?? NEUTRAL_CATEGORY_COLOR }
                        : {}),
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

interface TopExpensesCardProps {
  expenses: TopExpense[];
}

const TopExpensesCard = ({ expenses }: TopExpensesCardProps) => {
  const { format } = useCurrency();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Largest expenses</CardTitle>
        <CardDescription>The biggest single entries this period.</CardDescription>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No expenses recorded for this period.
          </p>
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
                <span className="shrink-0 font-semibold tabular-nums">
                  {format(expense.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

interface ExpenseBreakdownSectionProps {
  byCategory: ExpenseBreakdown[];
  byMember: ExpenseBreakdown[];
  byPaymentMethod: ExpenseBreakdown[];
  topExpenses: TopExpense[];
}

const ExpenseBreakdownSection = ({
  byCategory,
  byMember,
  byPaymentMethod,
  topExpenses,
}: ExpenseBreakdownSectionProps) => (
  <div className="grid gap-4 lg:grid-cols-2">
    <BreakdownCard
      title="By category"
      description="Where this period's money went."
      rows={byCategory}
      emptyLabel="No expenses recorded for this period."
      useRowColor
    />
    <BreakdownCard
      title="By member"
      description="Who spent what."
      rows={byMember}
      emptyLabel="No expenses recorded for this period."
    />
    <BreakdownCard
      title="By payment method"
      description="How the family paid."
      rows={byPaymentMethod}
      emptyLabel="No expenses recorded for this period."
    />
    <TopExpensesCard expenses={topExpenses} />
  </div>
);

export default ExpenseBreakdownSection;

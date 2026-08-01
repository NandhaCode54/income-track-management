import { Link } from 'react-router-dom';
import { AlertCircle, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/common/EmptyState';
import BudgetProgress from '@/features/budget/BudgetProgress';
import { ROUTES } from '@/constants/routes';
import { useCurrency } from '@/hooks/useCurrency';
import type { BudgetSnapshot } from '@/types/dashboard.types';

interface BudgetSnapshotCardProps {
  snapshot: BudgetSnapshot | null;
  periodLabel: string;
  isLoading: boolean;
}

/**
 * The month's plan as a single meter — a ratio against a limit, which is what a
 * meter is for. The bar, its percentage and its status word all come from the
 * budget module's own `BudgetProgress`, so the dashboard cannot drift out of step
 * with the budget page over what "over budget" looks like.
 */
const BudgetSnapshotCard = ({ snapshot, periodLabel, isLoading }: BudgetSnapshotCardProps) => {
  const { format } = useCurrency();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Budget</CardTitle>
        <CardDescription>How {periodLabel} is tracking against the plan.</CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-muted/40" />
        ) : !snapshot ? (
          <EmptyState
            icon={PiggyBank}
            title={`No budget set for ${periodLabel}`}
            description="Set a limit on the categories worth watching, and this card starts tracking them."
            action={
              <Button asChild variant="outline">
                <Link to={ROUTES.BUDGET}>Open budget planner</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <BudgetProgress
              budgeted={snapshot.budgeted}
              spent={snapshot.spent}
              percentUsed={snapshot.percentUsed}
              status={snapshot.status}
              size="lg"
            />

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Over their limit</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {snapshot.overspentCount}{' '}
                  <span className="font-normal text-muted-foreground">
                    {snapshot.overspentCount === 1 ? 'category' : 'categories'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Spent unbudgeted</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {format(snapshot.unbudgetedSpent)}
                </dd>
              </div>
            </dl>

            {/* The number above the bar only covers budgeted categories, so spending
                outside the plan is called out rather than quietly left off it. */}
            {snapshot.unbudgetedSpent > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <AlertCircle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {format(snapshot.unbudgetedSpent)} was spent in categories with no budget, so it
                  is not counted in the bar above.
                </span>
              </p>
            )}

            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to={ROUTES.BUDGET}>See every budget line</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetSnapshotCard;

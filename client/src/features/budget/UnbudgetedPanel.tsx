import { Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import { NEUTRAL_CATEGORY_COLOR } from './budget.constants';
import type { UnbudgetedLine } from '@/types/budget.types';

interface UnbudgetedPanelProps {
  lines: UnbudgetedLine[];
  total: number;
  onSetBudget: (categoryId: string) => void;
}

/**
 * Spending that no budget covers. This is the panel that makes a budget honest:
 * without it a family can look "on track" purely because the categories they
 * overspend in were never budgeted.
 */
const UnbudgetedPanel = ({ lines, total, onSetBudget }: UnbudgetedPanelProps) => {
  const { format } = useCurrency();
  const { can } = usePermission();

  if (lines.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Unbudgeted spending</CardTitle>
        <CardDescription>
          {format(total)} went to categories with no limit set this month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {lines.map((line) => (
            <li
              key={line.categoryId ?? 'uncategorised'}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
                style={{ backgroundColor: line.color ?? NEUTRAL_CATEGORY_COLOR }}
                aria-hidden
              >
                {line.icon ?? line.label.charAt(0).toUpperCase()}
              </span>

              <span className="min-w-0 flex-1 truncate text-sm font-medium">{line.label}</span>

              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {format(line.spent)}
              </span>

              {/* Uncategorised spending has no category to budget against. */}
              {can('BUDGET_MANAGE') && line.categoryId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetBudget(line.categoryId as string)}
                >
                  <Plus className="h-4 w-4" />
                  Set budget
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default UnbudgetedPanel;

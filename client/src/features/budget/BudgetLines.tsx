import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import BudgetProgress from './BudgetProgress';
import { NEUTRAL_CATEGORY_COLOR, STATUS_LABELS, STATUS_STYLES } from './budget.constants';
import { useDeleteBudget } from './budget.hooks';
import type { BudgetLine } from '@/types/budget.types';

interface BudgetLinesProps {
  lines: BudgetLine[];
  onEdit: (line: BudgetLine) => void;
}

const BudgetLines = ({ lines, onEdit }: BudgetLinesProps) => {
  const { format } = useCurrency();
  const { can } = usePermission();
  const deleteBudget = useDeleteBudget();
  const [pendingDelete, setPendingDelete] = useState<BudgetLine | null>(null);

  const canManage = can('BUDGET_MANAGE');

  return (
    <>
      <ul className="divide-y">
        {lines.map((line) => (
          <li key={line.budgetId} className="p-4">
            <div className="flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: line.color ?? NEUTRAL_CATEGORY_COLOR }}
                aria-hidden
              >
                {line.icon ?? line.label.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{line.label}</span>
                    <Badge
                      variant={
                        STATUS_STYLES[line.status].badge as 'success' | 'warning' | 'destructive'
                      }
                    >
                      {STATUS_LABELS[line.status]}
                    </Badge>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(line)}
                        aria-label={`Edit the ${line.label} budget`}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(line)}
                        aria-label={`Remove the ${line.label} budget`}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <BudgetProgress
                  budgeted={line.budgeted}
                  spent={line.spent}
                  percentUsed={line.percentUsed}
                  status={line.status}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Remove the ${pendingDelete?.label ?? ''} budget?`}
        description={
          pendingDelete
            ? `The ${format(pendingDelete.budgeted)} limit for this month is removed. The ${format(
                pendingDelete.spent,
              )} already spent stays exactly where it is — only the target goes.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        loading={deleteBudget.isPending}
        onConfirm={() =>
          pendingDelete &&
          deleteBudget.mutate(pendingDelete.budgetId, {
            onSuccess: () => setPendingDelete(null),
          })
        }
      />
    </>
  );
};

export default BudgetLines;

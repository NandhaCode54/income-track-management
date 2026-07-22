import { useState } from 'react';
import { Pencil, Repeat, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import { formatDate, formatRelative } from '@/utils/formatDate';
import type { Income } from '@/types/income.types';
import { FREQUENCY_LABELS, INCOME_TYPE_ICONS, INCOME_TYPE_LABELS } from './income.constants';
import { useDeleteIncome } from './income.hooks';

interface IncomeTableProps {
  income: Income[];
  onEdit: (income: Income) => void;
}

const IncomeTable = ({ income, onEdit }: IncomeTableProps) => {
  const { format } = useCurrency();
  const { can, isAtLeast } = usePermission();
  const deleteIncome = useDeleteIncome();
  const [pendingDelete, setPendingDelete] = useState<Income | null>(null);

  /**
   * Mirrors the server rule: you can always manage your own entries, but touching
   * someone else's needs a family head or the workspace owner.
   */
  const canManage = (entry: Income) =>
    can('FINANCE_WRITE') && (entry.isOwn || isAtLeast('FAMILY_HEAD'));

  const showActions = income.some(canManage);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Earned by</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              {showActions && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {income.map((entry) => {
              const Icon = INCOME_TYPE_ICONS[entry.type];

              return (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {entry.description || INCOME_TYPE_LABELS[entry.type]}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="muted">{INCOME_TYPE_LABELS[entry.type]}</Badge>
                          {entry.isRecurring && entry.frequency && (
                            <Badge variant="secondary" className="gap-1">
                              <Repeat className="h-3 w-3" />
                              {FREQUENCY_LABELS[entry.frequency]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className={entry.member.isActive ? '' : 'text-muted-foreground'}>
                      {entry.member.firstName} {entry.member.lastName}
                    </span>
                    {entry.isOwn && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                  </td>

                  <td className="px-4 py-3">
                    <p>{formatDate(entry.date)}</p>
                    {entry.nextOccurrence && (
                      <p className="text-xs text-muted-foreground">
                        Next {formatRelative(entry.nextOccurrence)}
                      </p>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {format(entry.amount)}
                  </td>

                  {showActions && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canManage(entry) && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEdit(entry)}
                              aria-label={`Edit ${entry.description || INCOME_TYPE_LABELS[entry.type]}`}
                              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDelete(entry)}
                              aria-label={`Delete ${entry.description || INCOME_TYPE_LABELS[entry.type]}`}
                              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this income entry?"
        description={
          pendingDelete
            ? `${format(pendingDelete.amount)} from ${formatDate(pendingDelete.date)} will be removed permanently and every report recalculated.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={deleteIncome.isPending}
        onConfirm={() =>
          pendingDelete &&
          deleteIncome.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
        }
      />
    </>
  );
};

export default IncomeTable;

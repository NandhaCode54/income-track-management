import { useState } from 'react';
import { Paperclip, Pencil, Repeat, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import { formatDate, formatRelative } from '@/utils/formatDate';
import { FREQUENCY_LABELS } from '@/features/income/income.constants';
import { NEUTRAL_CATEGORY_COLOR, PAYMENT_METHOD_LABELS } from './expense.constants';
import { useDeleteExpense } from './expense.hooks';
import type { Expense } from '@/types/expense.types';

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onManageReceipts: (expense: Expense) => void;
}

const categoryLabel = (expense: Expense): string => {
  if (!expense.category) return 'Uncategorised';
  return expense.category.parentName
    ? `${expense.category.parentName} › ${expense.category.name}`
    : expense.category.name;
};

const ExpenseTable = ({ expenses, onEdit, onManageReceipts }: ExpenseTableProps) => {
  const { format } = useCurrency();
  const { can, isAtLeast } = usePermission();
  const deleteExpense = useDeleteExpense();
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  /**
   * Mirrors the server rule: you can always manage your own entries, but touching
   * someone else's needs a family head or the workspace owner.
   */
  const canManage = (entry: Expense) =>
    can('FINANCE_WRITE') && (entry.isOwn || isAtLeast('FAMILY_HEAD'));

  const showActions = expenses.some(canManage) || expenses.some((entry) => entry.receipts.length > 0);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Expense</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Paid by</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              {showActions && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {expenses.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    {/* The category swatch, with its initial as a non-colour cue. */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
                      style={{
                        backgroundColor: entry.category?.color ?? NEUTRAL_CATEGORY_COLOR,
                      }}
                      aria-hidden
                    >
                      {entry.category?.icon ?? (entry.category?.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entry.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="muted">{categoryLabel(entry)}</Badge>
                        {entry.paymentMethod && (
                          <Badge variant="outline">
                            {PAYMENT_METHOD_LABELS[entry.paymentMethod]}
                          </Badge>
                        )}
                        {entry.isRecurring && entry.frequency && (
                          <Badge variant="secondary" className="gap-1">
                            <Repeat className="h-3 w-3" />
                            {FREQUENCY_LABELS[entry.frequency]}
                          </Badge>
                        )}
                        {entry.tags.map((tag) => (
                          <Badge key={tag} variant="default">
                            #{tag}
                          </Badge>
                        ))}
                        {entry.receipts.length > 0 && (
                          <Badge variant="success" className="gap-1">
                            <Paperclip className="h-3 w-3" />
                            {entry.receipts.length}
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

                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                  {format(entry.amount)}
                </td>

                {showActions && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {(canManage(entry) || entry.receipts.length > 0) && (
                        <button
                          type="button"
                          onClick={() => onManageReceipts(entry)}
                          aria-label={`Receipts for ${entry.description}`}
                          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                      )}
                      {canManage(entry) && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEdit(entry)}
                            aria-label={`Edit ${entry.description}`}
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(entry)}
                            aria-label={`Delete ${entry.description}`}
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
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this expense?"
        description={
          pendingDelete
            ? `${format(pendingDelete.amount)} from ${formatDate(pendingDelete.date)} will be removed permanently${
                pendingDelete.receipts.length > 0
                  ? `, along with ${pendingDelete.receipts.length} receipt${
                      pendingDelete.receipts.length === 1 ? '' : 's'
                    }`
                  : ''
              }, and every report recalculated.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={deleteExpense.isPending}
        onConfirm={() =>
          pendingDelete &&
          deleteExpense.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
        }
      />
    </>
  );
};

export default ExpenseTable;

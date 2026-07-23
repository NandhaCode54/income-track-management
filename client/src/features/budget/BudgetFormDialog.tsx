import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCurrency } from '@/hooks/useCurrency';
import { MONTH_NAMES } from '@/utils/formatDate';
import { flattenCategories, useExpenseCategories } from '@/features/expenses/expense.hooks';
import { budgetFormSchema, type BudgetForm } from './budget.schemas';
import { useCreateBudget, useUpdateBudget } from './budget.hooks';
import type { BudgetLine, BudgetPeriod } from '@/types/budget.types';

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: BudgetPeriod;
  /** Present when editing an existing line; omitted when setting a new one. */
  line?: BudgetLine | null;
  /** Category ids that already have a budget this month — they can't be picked twice. */
  takenCategoryIds: string[];
  /** True when a family-wide budget already exists, so the option is withheld. */
  hasOverall: boolean;
  /** Pre-selects a category, e.g. from an "unbudgeted" row's Set budget button. */
  defaultCategoryId?: string;
}

const BudgetFormDialog = ({
  open,
  onOpenChange,
  period,
  line,
  takenCategoryIds,
  hasOverall,
  defaultCategoryId,
}: BudgetFormDialogProps) => {
  const isEdit = !!line;
  const { symbol } = useCurrency();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();

  const categoriesQuery = useExpenseCategories();
  const allCategories = useMemo(
    () => flattenCategories(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  );

  // Only categories without a budget this month are offered — the server would
  // return 409 for the rest, and an option that always fails is not an option.
  const available = allCategories.filter((category) => !takenCategoryIds.includes(category.id));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BudgetForm>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: { amount: '', categoryId: '' },
  });

  // The dialog is mounted once and reused, so values are re-seeded on each open.
  useEffect(() => {
    if (!open) return;
    reset({
      amount: line ? String(line.budgeted) : '',
      categoryId: line ? (line.categoryId ?? '') : (defaultCategoryId ?? ''),
    });
  }, [open, line, defaultCategoryId, reset]);

  const pending = createBudget.isPending || updateBudget.isPending;
  const periodLabel = `${MONTH_NAMES[period.month - 1]} ${period.year}`;

  const onSubmit = (values: BudgetForm) => {
    const close = { onSuccess: () => onOpenChange(false) };

    if (isEdit && line) {
      updateBudget.mutate({ id: line.budgetId, amount: Number(values.amount) }, close);
      return;
    }

    createBudget.mutate(
      {
        amount: Number(values.amount),
        month: period.month,
        year: period.year,
        categoryId: values.categoryId || undefined,
      },
      close,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${line?.label} budget` : 'Set a budget'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Adjust the limit for ${periodLabel}.`
              : `Cap what the family spends in ${periodLabel}. Budgets apply to one month at a time.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="budgetCategory">Category</Label>
              <Select id="budgetCategory" {...register('categoryId')}>
                {/* Withheld once set: a second family-wide budget is a 409. */}
                {!hasOverall && <option value="">Everything (family-wide cap)</option>}
                {available.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon ? `${category.icon} ` : ''}
                    {category.label}
                  </option>
                ))}
              </Select>
              {hasOverall && available.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Every category already has a budget this month.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="budgetAmount">Monthly limit</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {symbol}
              </span>
              <Input
                id="budgetAmount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-8"
                aria-invalid={!!errors.amount}
                {...register('amount')}
              />
            </div>
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || (!isEdit && hasOverall && available.length === 0)}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Set budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetFormDialog;

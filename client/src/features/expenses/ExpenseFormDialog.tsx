import { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import { useFamilyMembers } from '@/features/family/family.hooks';
import { FREQUENCY_LABELS } from '@/features/income/income.constants';
import { toDateInputValue } from '@/utils/formatDate';
import { REPEAT_FREQUENCIES } from '@/types/income.types';
import { PAYMENT_METHODS, type Expense } from '@/types/expense.types';
import { PAYMENT_METHOD_LABELS } from './expense.constants';
import { expenseFormSchema, splitTags, type ExpenseForm } from './expense.schemas';
import {
  flattenCategories,
  useCreateExpense,
  useExpenseCategories,
  useUpdateExpense,
} from './expense.hooks';

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; omitted when adding. */
  expense?: Expense | null;
  /** Pre-selects a category when the form is opened from a category view. */
  defaultCategoryId?: string;
}

const emptyForm = (categoryId = ''): ExpenseForm => ({
  amount: '',
  description: '',
  date: toDateInputValue(new Date()),
  categoryId,
  paymentMethod: '',
  tags: '',
  notes: '',
  isRecurring: false,
  frequency: undefined,
  memberId: '',
});

const toFormValues = (expense: Expense): ExpenseForm => ({
  amount: String(expense.amount),
  description: expense.description,
  date: toDateInputValue(expense.date),
  categoryId: expense.category?.id ?? '',
  paymentMethod: expense.paymentMethod ?? '',
  tags: expense.tags.join(', '),
  notes: expense.notes ?? '',
  isRecurring: expense.isRecurring,
  frequency:
    expense.isRecurring && expense.frequency && expense.frequency !== 'ONCE'
      ? expense.frequency
      : undefined,
  memberId: expense.member.id,
});

const ExpenseFormDialog = ({
  open,
  onOpenChange,
  expense,
  defaultCategoryId,
}: ExpenseFormDialogProps) => {
  const isEdit = !!expense;
  const { symbol } = useCurrency();
  const { isAtLeast } = usePermission();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  // Only heads and owners may log an expense against another member.
  const canAttribute = isAtLeast('FAMILY_HEAD');
  const membersQuery = useFamilyMembers();
  const members = (membersQuery.data ?? []).filter((member) => member.isActive);

  const categoriesQuery = useExpenseCategories();
  const categories = flattenCategories(categoriesQuery.data ?? []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: emptyForm(defaultCategoryId),
  });

  // The dialog is mounted once and reused, so values are re-seeded on each open.
  useEffect(() => {
    if (open) reset(expense ? toFormValues(expense) : emptyForm(defaultCategoryId));
  }, [open, expense, defaultCategoryId, reset]);

  const isRecurring = watch('isRecurring');
  const pending = createExpense.isPending || updateExpense.isPending;

  const onSubmit = (values: ExpenseForm) => {
    const payload = {
      amount: Number(values.amount),
      description: values.description.trim(),
      date: values.date,
      // Sent as '' rather than omitted: an absent key means "unchanged" to the API,
      // so a cleared field has to travel as an explicit empty value.
      categoryId: values.categoryId ?? '',
      paymentMethod: values.paymentMethod ?? '',
      tags: splitTags(values.tags ?? ''),
      notes: values.notes?.trim() ?? '',
      isRecurring: values.isRecurring,
      frequency: values.isRecurring ? values.frequency : undefined,
      memberId: canAttribute && values.memberId ? values.memberId : undefined,
    };

    const close = { onSuccess: () => onOpenChange(false) };
    if (isEdit && expense) {
      updateExpense.mutate({ id: expense.id, payload }, close);
    } else {
      createExpense.mutate(payload, close);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit expense' : 'Add expense'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this entry. Changes are reflected in every report immediately.'
              : 'Record money going out. Mark it recurring if it repeats on a schedule.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="expenseDescription">Description</Label>
            <Input
              id="expenseDescription"
              placeholder="e.g. Weekly groceries"
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expenseAmount">Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {symbol}
                </span>
                <Input
                  id="expenseAmount"
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

            <div className="space-y-2">
              <Label htmlFor="expenseDate">Date spent</Label>
              <Input
                id="expenseDate"
                type="date"
                aria-invalid={!!errors.date}
                {...register('date')}
              />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expenseCategory">Category</Label>
              <Select id="expenseCategory" {...register('categoryId')}>
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon ? `${category.icon} ` : ''}
                    {category.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseMethod">Paid with</Label>
              <Select id="expenseMethod" {...register('paymentMethod')}>
                <option value="">Not recorded</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expenseTags">Tags</Label>
              <Input
                id="expenseTags"
                placeholder="groceries, weekly"
                aria-invalid={!!errors.tags}
                {...register('tags')}
              />
              <p className="text-xs text-muted-foreground">Separate with commas.</p>
              {errors.tags && <p className="text-sm text-destructive">{errors.tags.message}</p>}
            </div>

            {canAttribute && (
              <div className="space-y-2">
                <Label htmlFor="expenseMember">Paid by</Label>
                <Select id="expenseMember" {...register('memberId')}>
                  <option value="">Me</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.user.firstName} {member.user.lastName}
                      {member.isSelf ? ' (you)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                {...register('isRecurring')}
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">This expense repeats</span>
                <span className="block text-xs text-muted-foreground">
                  We&apos;ll show you when the next one is due.
                </span>
              </span>
            </label>

            {isRecurring && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="expenseFrequency">How often</Label>
                <Select
                  id="expenseFrequency"
                  aria-invalid={!!errors.frequency}
                  {...register('frequency')}
                >
                  <option value="">Select a frequency…</option>
                  {REPEAT_FREQUENCIES.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {FREQUENCY_LABELS[frequency]}
                    </option>
                  ))}
                </Select>
                {errors.frequency && (
                  <p className="text-sm text-destructive">{errors.frequency.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expenseNotes">Notes</Label>
            <Textarea
              id="expenseNotes"
              rows={3}
              placeholder="Anything worth remembering about this entry."
              aria-invalid={!!errors.notes}
              {...register('notes')}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
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
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseFormDialog;

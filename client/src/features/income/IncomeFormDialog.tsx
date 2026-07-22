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
import { toDateInputValue } from '@/utils/formatDate';
import { INCOME_TYPES, REPEAT_FREQUENCIES, type Income } from '@/types/income.types';
import { FREQUENCY_LABELS, INCOME_TYPE_LABELS } from './income.constants';
import { incomeFormSchema, type IncomeForm } from './income.schemas';
import { useCreateIncome, useUpdateIncome } from './income.hooks';

interface IncomeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; omitted when adding. */
  income?: Income | null;
}

const emptyForm = (): IncomeForm => ({
  type: 'SALARY',
  amount: '',
  date: toDateInputValue(new Date()),
  description: '',
  notes: '',
  isRecurring: false,
  frequency: undefined,
  memberId: '',
});

const toFormValues = (income: Income): IncomeForm => ({
  type: income.type,
  amount: String(income.amount),
  date: toDateInputValue(income.date),
  description: income.description ?? '',
  notes: income.notes ?? '',
  isRecurring: income.isRecurring,
  frequency:
    income.isRecurring && income.frequency && income.frequency !== 'ONCE'
      ? income.frequency
      : undefined,
  memberId: income.member.id,
});

const IncomeFormDialog = ({ open, onOpenChange, income }: IncomeFormDialogProps) => {
  const isEdit = !!income;
  const { symbol } = useCurrency();
  const { isAtLeast } = usePermission();
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();

  // Only heads and owners may log income against another member.
  const canAttribute = isAtLeast('FAMILY_HEAD');
  const membersQuery = useFamilyMembers();
  const members = (membersQuery.data ?? []).filter((member) => member.isActive);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<IncomeForm>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: emptyForm(),
  });

  // The dialog is mounted once and reused, so values are re-seeded on each open.
  useEffect(() => {
    if (open) reset(income ? toFormValues(income) : emptyForm());
  }, [open, income, reset]);

  const isRecurring = watch('isRecurring');
  const pending = createIncome.isPending || updateIncome.isPending;

  const onSubmit = (values: IncomeForm) => {
    const payload = {
      type: values.type,
      amount: Number(values.amount),
      date: values.date,
      // Sent as '' rather than omitted: an absent key means "unchanged" to the API,
      // so a cleared field has to travel as an explicit empty value.
      description: values.description?.trim() ?? '',
      notes: values.notes?.trim() ?? '',
      isRecurring: values.isRecurring,
      frequency: values.isRecurring ? values.frequency : undefined,
      memberId: canAttribute && values.memberId ? values.memberId : undefined,
    };

    const close = { onSuccess: () => onOpenChange(false) };
    if (isEdit && income) {
      updateIncome.mutate({ id: income.id, payload }, close);
    } else {
      createIncome.mutate(payload, close);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit income' : 'Add income'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this entry. Changes are reflected in every report immediately.'
              : 'Record money coming in. Mark it recurring if it arrives on a schedule.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="incomeType">Type</Label>
              <Select id="incomeType" aria-invalid={!!errors.type} {...register('type')}>
                {INCOME_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {INCOME_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
              {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomeAmount">Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {symbol}
                </span>
                <Input
                  id="incomeAmount"
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
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="incomeDate">Date received</Label>
              <Input
                id="incomeDate"
                type="date"
                aria-invalid={!!errors.date}
                {...register('date')}
              />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>

            {canAttribute && (
              <div className="space-y-2">
                <Label htmlFor="incomeMember">Earned by</Label>
                <Select id="incomeMember" {...register('memberId')}>
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

          <div className="space-y-2">
            <Label htmlFor="incomeDescription">Description</Label>
            <Input
              id="incomeDescription"
              placeholder="e.g. October salary"
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
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
                <span className="block text-sm font-medium">This income repeats</span>
                <span className="block text-xs text-muted-foreground">
                  We&apos;ll show you when the next one is due.
                </span>
              </span>
            </label>

            {isRecurring && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="incomeFrequency">How often</Label>
                <Select
                  id="incomeFrequency"
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
            <Label htmlFor="incomeNotes">Notes</Label>
            <Textarea
              id="incomeNotes"
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
              {isEdit ? 'Save changes' : 'Add income'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IncomeFormDialog;

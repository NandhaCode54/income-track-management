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
import { toDateInputValue } from '@/utils/formatDate';
import type { ChitFund } from '@/types/chit-fund.types';
import { chitPaymentFormSchema, type ChitPaymentForm } from './chit-fund.schemas';
import { useRecordChitPayment } from './chit-fund.hooks';

interface RecordChitPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: ChitFund | null;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' }),
);

const RecordChitPaymentDialog = ({
  open,
  onOpenChange,
  fund,
}: RecordChitPaymentDialogProps) => {
  const recordPayment = useRecordChitPayment();

  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChitPaymentForm>({
    resolver: zodResolver(chitPaymentFormSchema),
    defaultValues: {
      month: String(thisMonth),
      year: String(thisYear),
      amount: '',
      paidDate: toDateInputValue(now),
    },
  });

  useEffect(() => {
    if (!open || !fund) return;
    // The common case is paying this month's instalment in full, so the form
    // opens pre-filled for exactly that and the month picker catches back-pay.
    const paidMonths = new Set(fund.payments.map((p) => `${p.year}-${p.month}`));
    let month = thisMonth;
    let year = thisYear;
    if (paidMonths.has(`${year}-${month}`)) {
      month = month === 1 ? 12 : month - 1;
      if (month === 12) year -= 1;
    }
    reset({
      month: String(month),
      year: String(year),
      amount: String(fund.monthlyAmount),
      paidDate: toDateInputValue(now),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fund, reset]);

  const onSubmit = (v: ChitPaymentForm) => {
    if (!fund) return;
    recordPayment.mutate(
      {
        id: fund.id,
        payload: {
          month: Number(v.month),
          year: Number(v.year),
          amount: Number(v.amount),
          ...(v.paidDate ? { paidDate: new Date(v.paidDate).toISOString() } : {}),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const yearOptions: number[] = fund
    ? Array.from(
        { length: Math.max(new Date(fund.endDate).getFullYear() - new Date(fund.startDate).getFullYear() + 1, 1) },
        (_, i) => new Date(fund.startDate).getFullYear() + i,
      )
    : [thisYear];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record a monthly payment</DialogTitle>
          <DialogDescription>
            {fund ? `A payment for ${fund.name}.` : 'Record one month of the chit.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chitMonth">Month</Label>
              <Select id="chitMonth" aria-invalid={!!errors.month} {...register('month')}>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={String(m)}>
                    {MONTH_LABELS[m - 1]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chitYear">Year</Label>
              <Select id="chitYear" aria-invalid={!!errors.year} {...register('year')}>
                {[...new Set([...yearOptions, thisYear])].sort((a, b) => a - b).map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chitAmount">Amount</Label>
              <Input
                id="chitAmount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                aria-invalid={!!errors.amount}
                {...register('amount')}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="chitPaidDate">Paid on (optional)</Label>
              <Input id="chitPaidDate" type="date" {...register('paidDate')} />
            </div>
          </div>

          <p className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
            Recording the same month again replaces that entry — use it to correct an amount or date.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={recordPayment.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecordChitPaymentDialog;

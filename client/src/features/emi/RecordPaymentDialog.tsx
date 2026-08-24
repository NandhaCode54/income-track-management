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
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDate, toDateInputValue } from '@/utils/formatDate';
import { RECORDABLE_STATUSES, type Emi, type EmiPayment } from '@/types/emi.types';
import { RECORDABLE_STATUS_LABELS } from './emi.constants';
import { recordPaymentSchema, type RecordPaymentForm } from './emi.schemas';
import { useEmi, useRecordEmiPayment } from './emi.hooks';

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emi: Emi | null;
  /** Pre-selects an instalment when opened from a specific row. */
  presetPaymentId?: string | null;
}

const RecordPaymentDialog = ({
  open,
  onOpenChange,
  emi,
  presetPaymentId,
}: RecordPaymentDialogProps) => {
  const { symbol, format } = useCurrency();
  const recordPayment = useRecordEmiPayment();

  /*
   * The schedule is read from the live detail query rather than a copy held in
   * state when the dialog opened — the same stale-dialog trap Phase 4 hit with
   * receipts. Record one instalment and the list refetches; a snapshot would
   * still be offering the instalment that was just settled.
   */
  const detail = useEmi(open && emi ? emi.id : null);

  const openInstalments = useMemo(
    () =>
      (detail.data?.payments ?? []).filter(
        (payment) => payment.status !== 'PAID' && payment.status !== 'WAIVED',
      ),
    [detail.data],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecordPaymentForm>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      paymentId: '',
      amount: '',
      paidDate: toDateInputValue(new Date()),
      status: 'PAID',
      notes: '',
    },
  });

  const selectedId = watch('paymentId');
  const selected: EmiPayment | undefined = openInstalments.find(
    (payment) => payment.id === selectedId,
  );

  /*
   * Seed once the instalments are actually loaded, not merely when the dialog
   * opens: the detail query is still in flight at that point, so seeding on
   * `open` alone would select nothing and leave the amount blank.
   */
  useEffect(() => {
    if (!open || openInstalments.length === 0) return;

    const target =
      openInstalments.find((payment) => payment.id === presetPaymentId) ??
      // Oldest unsettled first — arrears are paid before what is merely due next.
      openInstalments[0];

    reset({
      paymentId: target.id,
      amount: String(target.amount),
      paidDate: toDateInputValue(new Date()),
      status: 'PAID',
      notes: '',
    });
  }, [open, openInstalments, presetPaymentId, reset]);

  // Switching instalment re-seeds the amount, because paying exactly what is due
  // is the case that happens every month.
  useEffect(() => {
    if (selected) setValue('amount', String(selected.amount));
  }, [selected, setValue]);

  const status = watch('status');

  const onSubmit = (values: RecordPaymentForm) => {
    if (!emi || !selected) return;

    recordPayment.mutate(
      {
        id: emi.id,
        payload: {
          month: selected.month,
          year: selected.year,
          amount: Number(values.amount),
          // A waived instalment was never actually paid, so no date travels with it.
          paidDate: values.status === 'WAIVED' ? undefined : values.paidDate,
          status: values.status,
          notes: values.notes?.trim() || undefined,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            {emi ? `Settle an instalment of ${emi.name}.` : 'Settle an instalment.'}
          </DialogDescription>
        </DialogHeader>

        {detail.isPending ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : openInstalments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Every instalment on this loan is already settled.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="paymentInstalment">Instalment</Label>
              <Select id="paymentInstalment" {...register('paymentId')}>
                {openInstalments.map((payment) => (
                  <option key={payment.id} value={payment.id}>
                    {formatDate(payment.dueDate)} · {format(payment.amount)}
                    {payment.isOverdue ? ' · missed' : ''}
                    {payment.status === 'PARTIAL' ? ' · part-paid' : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Amount paid</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {symbol}
                  </span>
                  <Input
                    id="paymentAmount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    className="pl-8"
                    aria-invalid={!!errors.amount}
                    {...register('amount')}
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">How it was settled</Label>
                <Select id="paymentStatus" {...register('status')}>
                  {RECORDABLE_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {RECORDABLE_STATUS_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {status !== 'WAIVED' && (
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Paid on</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  aria-invalid={!!errors.paidDate}
                  {...register('paidDate')}
                />
                {errors.paidDate && (
                  <p className="text-sm text-destructive">{errors.paidDate.message}</p>
                )}
              </div>
            )}

            {status === 'PARTIAL' && (
              <p className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
                A part-paid instalment stays on the schedule and keeps counting towards what is
                still owed, so the rest is not quietly forgotten.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes</Label>
              <Textarea
                id="paymentNotes"
                rows={2}
                placeholder="Reference number, or why it was short."
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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;

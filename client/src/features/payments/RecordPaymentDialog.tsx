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
import type { PaymentItem, PaymentKind } from '@/types/payments.types';
import { PAYMENT_STATUS_LABELS } from '@/types/payments.types';
import { recordPaymentFormSchema, type RecordPaymentForm } from './payments.schemas';
import { useRecordPayment } from './payments.hooks';

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PaymentKind;
  item: PaymentItem | null;
}

const SETTLEMENT_OPTIONS = ['PAID', 'PARTIAL', 'WAIVED'] as const;

const RecordPaymentDialog = ({
  open,
  onOpenChange,
  kind,
  item,
}: RecordPaymentDialogProps) => {
  const recordPayment = useRecordPayment(kind);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RecordPaymentForm>({
    resolver: zodResolver(recordPaymentFormSchema),
    defaultValues: { status: 'PAID', paidDate: toDateInputValue(new Date()) },
  });

  useEffect(() => {
    if (!open) return;
    // Reopening after a WAIVED save must not keep the date hidden-but-set.
    reset({ status: 'PAID', paidDate: toDateInputValue(new Date()) });
  }, [open, item, reset]);

  const status = watch('status');
  const nameOf = (row: PaymentItem) =>
    row.kind === 'bill'
      ? row.name
      : row.kind === 'rent'
        ? row.propertyName
        : row.studentName;

  const onSubmit = (v: RecordPaymentForm) => {
    if (!item) return;
    recordPayment.mutate(
      {
        id: item.id,
        payload: {
          status: v.status,
          // A waived obligation was never paid, so no date travels with it —
          // the server keeps paidDate null for exactly this case.
          paidDate:
            v.status === 'WAIVED' ? undefined : new Date(v.paidDate ?? '').toISOString(),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            {item ? `Settle ${nameOf(item)}.` : 'Settle this obligation.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="paymentStatus">How it was settled</Label>
            <Select id="paymentStatus" {...register('status')}>
              {SETTLEMENT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {PAYMENT_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>

          {status !== 'WAIVED' && (
            <div className="space-y-2">
              <Label htmlFor="paymentPaidDate">Paid on</Label>
              <Input
                id="paymentPaidDate"
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
              A partial payment keeps the obligation open so the remainder is not quietly forgotten.
            </p>
          )}

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

export default RecordPaymentDialog;

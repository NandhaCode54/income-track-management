import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Loader2 } from 'lucide-react';
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
import { useDebounce } from '@/hooks/useDebounce';
import { toDateInputValue } from '@/utils/formatDate';
import { EMI_STATUSES, type Emi } from '@/types/emi.types';
import { EMI_STATUS_LABELS } from './emi.constants';
import { emiFormSchema, type EmiForm } from './emi.schemas';
import { useCreateEmi, useEmiCalculator, useUpdateEmi } from './emi.hooks';

interface EmiFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; omitted when adding. */
  emi?: Emi | null;
}

const emptyForm = (): EmiForm => ({
  name: '',
  lenderName: '',
  loanAmount: '',
  interestRate: '',
  tenureMonths: '',
  monthlyEMI: '',
  startDate: toDateInputValue(new Date()),
  dueDay: '5',
  status: 'ACTIVE',
  notes: '',
});

const toFormValues = (emi: Emi): EmiForm => ({
  name: emi.name,
  lenderName: emi.lenderName ?? '',
  loanAmount: String(emi.loanAmount),
  interestRate: String(emi.interestRate),
  tenureMonths: String(emi.tenureMonths),
  monthlyEMI: String(emi.monthlyEMI),
  startDate: toDateInputValue(emi.startDate),
  dueDay: String(emi.dueDay),
  status: emi.status,
  notes: emi.notes ?? '',
});

const EmiFormDialog = ({ open, onOpenChange, emi }: EmiFormDialogProps) => {
  const isEdit = !!emi;
  const { symbol, format } = useCurrency();
  const createEmi = useCreateEmi();
  const updateEmi = useUpdateEmi();

  /**
   * Terms lock once anything has been paid — the server refuses them, and the
   * form greys them out rather than letting someone fill in a field that will
   * come back as a 422. The rule is re-derived here from the progress the list
   * already carries, so no extra request is needed to know it.
   */
  const termsLocked = isEdit && (emi?.progress.paidCount ?? 0) > 0;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EmiForm>({
    resolver: zodResolver(emiFormSchema),
    defaultValues: emptyForm(),
  });

  // The dialog is mounted once and reused, so values are re-seeded on each open.
  useEffect(() => {
    if (open) reset(emi ? toFormValues(emi) : emptyForm());
  }, [open, emi, reset]);

  const [loanAmount, interestRate, tenureMonths] = watch([
    'loanAmount',
    'interestRate',
    'tenureMonths',
  ]);

  /*
   * A live preview of the instalment as the terms are typed. Debounced so a
   * four-digit amount is one request rather than four, and only requested once
   * all three inputs parse — an incomplete form would otherwise produce a
   * confident answer to a question that has not been asked yet.
   */
  const previewInput = useDebounce(
    useMemo(() => {
      const principal = Number(loanAmount);
      const rate = Number(interestRate);
      const months = Number(tenureMonths);

      if (!loanAmount || !tenureMonths || interestRate === '') return null;
      if (!Number.isFinite(principal) || principal <= 0) return null;
      if (!Number.isFinite(rate) || rate < 0) return null;
      if (!Number.isInteger(months) || months < 1) return null;

      return { loanAmount: principal, interestRate: rate, tenureMonths: months };
    }, [loanAmount, interestRate, tenureMonths]),
    400,
  );

  const preview = useEmiCalculator(previewInput);
  const pending = createEmi.isPending || updateEmi.isPending;

  const onSubmit = (values: EmiForm) => {
    const descriptive = {
      name: values.name,
      // Sent as '' rather than omitted: an absent key means "unchanged" to the API,
      // so a cleared field has to travel as an explicit empty value.
      lenderName: values.lenderName?.trim() ?? '',
      notes: values.notes?.trim() ?? '',
    };

    const terms = {
      loanAmount: Number(values.loanAmount),
      interestRate: Number(values.interestRate),
      tenureMonths: Number(values.tenureMonths),
      // Blank means "work it out" — sending 0 would be rejected as an instalment
      // too small to ever clear the loan.
      monthlyEMI: values.monthlyEMI ? Number(values.monthlyEMI) : undefined,
      startDate: values.startDate,
      dueDay: Number(values.dueDay),
    };

    const close = { onSuccess: () => onOpenChange(false) };

    if (isEdit && emi) {
      updateEmi.mutate(
        {
          id: emi.id,
          payload: {
            ...descriptive,
            status: values.status,
            // Omitted entirely when locked, so an unchanged value cannot trip the
            // server's "terms are locked" check just by being present.
            ...(termsLocked ? {} : terms),
          },
        },
        close,
      );
    } else {
      createEmi.mutate({ ...descriptive, ...terms }, close);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit loan' : 'Add a loan'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this loan. The full instalment schedule is rebuilt if the terms change.'
              : 'Record a loan and its terms — the whole instalment schedule is generated for you.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emiName">Loan name</Label>
              <Input
                id="emiName"
                placeholder="e.g. Home loan"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emiLender">Lender</Label>
              <Input
                id="emiLender"
                placeholder="e.g. HDFC Bank"
                aria-invalid={!!errors.lenderName}
                {...register('lenderName')}
              />
              {errors.lenderName && (
                <p className="text-sm text-destructive">{errors.lenderName.message}</p>
              )}
            </div>
          </div>

          {termsLocked && (
            <p className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This loan already has payments recorded against it, so its terms are fixed —
                changing them would rewrite instalments that have already been settled. To correct
                them, delete the loan and add it again.
              </span>
            </p>
          )}

          <fieldset disabled={termsLocked} className="space-y-4 disabled:opacity-60">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="emiAmount">Loan amount</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {symbol}
                  </span>
                  <Input
                    id="emiAmount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-8"
                    aria-invalid={!!errors.loanAmount}
                    {...register('loanAmount')}
                  />
                </div>
                {errors.loanAmount && (
                  <p className="text-sm text-destructive">{errors.loanAmount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emiRate">Interest rate</Label>
                <div className="relative">
                  <Input
                    id="emiRate"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pr-8"
                    aria-invalid={!!errors.interestRate}
                    {...register('interestRate')}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Per year. Use 0 for a no-cost EMI.</p>
                {errors.interestRate && (
                  <p className="text-sm text-destructive">{errors.interestRate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emiTenure">Tenure</Label>
                <Input
                  id="emiTenure"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  placeholder="60"
                  aria-invalid={!!errors.tenureMonths}
                  {...register('tenureMonths')}
                />
                <p className="text-xs text-muted-foreground">In months.</p>
                {errors.tenureMonths && (
                  <p className="text-sm text-destructive">{errors.tenureMonths.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="emiStart">Start date</Label>
                <Input
                  id="emiStart"
                  type="date"
                  aria-invalid={!!errors.startDate}
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-sm text-destructive">{errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emiDueDay">Debited on</Label>
                <Input
                  id="emiDueDay"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  max="31"
                  aria-invalid={!!errors.dueDay}
                  {...register('dueDay')}
                />
                <p className="text-xs text-muted-foreground">
                  Day of the month. 31 falls back to the last day in shorter months.
                </p>
                {errors.dueDay && <p className="text-sm text-destructive">{errors.dueDay.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emiInstalment">Instalment</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {symbol}
                  </span>
                  <Input
                    id="emiInstalment"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Calculated"
                    className="pl-8"
                    aria-invalid={!!errors.monthlyEMI}
                    {...register('monthlyEMI')}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave blank to calculate it, or enter the lender&apos;s figure.
                </p>
                {errors.monthlyEMI && (
                  <p className="text-sm text-destructive">{errors.monthlyEMI.message}</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* The preview is the calculator, inline. Seeing the instalment before
              committing is the difference between recording a loan and choosing one. */}
          {preview.data && !termsLocked && (
            <div className="grid gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Monthly instalment</p>
                <p className="text-lg font-semibold tabular-nums">
                  {format(preview.data.monthlyEMI)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total interest</p>
                <p className="text-lg font-semibold tabular-nums">
                  {format(preview.data.totalInterest)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total repayable</p>
                <p className="text-lg font-semibold tabular-nums">
                  {format(preview.data.totalPayable)}
                </p>
              </div>
            </div>
          )}

          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="emiStatus">Status</Label>
              <Select id="emiStatus" {...register('status')}>
                {EMI_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {EMI_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                A loan closes itself when the last instalment is settled. Set it here only to mark
                it defaulted or foreclosed.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="emiNotes">Notes</Label>
            <Textarea
              id="emiNotes"
              rows={3}
              placeholder="Account number, sanction reference, anything worth remembering."
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
              {isEdit ? 'Save changes' : 'Add loan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmiFormDialog;

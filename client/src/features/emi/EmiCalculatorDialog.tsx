import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useDebounce } from '@/hooks/useDebounce';
import { calculatorSchema, type CalculatorForm } from './emi.schemas';
import { useEmiCalculator } from './emi.hooks';

interface EmiCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The what-if calculator: what would this loan cost?
 *
 * It has no Calculate button. The answer updates as the terms are typed
 * (debounced), because the question people actually have is comparative —
 * "what if I stretch it to seven years?" — and a button between every variation
 * and its answer turns exploring into a chore.
 *
 * It calls the same endpoint the loan form previews with, which runs the same
 * code that generates a stored schedule. There is exactly one implementation of
 * this arithmetic in the project.
 */
const EmiCalculatorDialog = ({ open, onOpenChange }: EmiCalculatorDialogProps) => {
  const { symbol, format } = useCurrency();
  const [showSchedule, setShowSchedule] = useState(false);

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<CalculatorForm>({
    resolver: zodResolver(calculatorSchema),
    mode: 'onChange',
    defaultValues: { loanAmount: '1000000', interestRate: '8.5', tenureMonths: '60' },
  });

  const [loanAmount, interestRate, tenureMonths] = watch([
    'loanAmount',
    'interestRate',
    'tenureMonths',
  ]);

  const input = useDebounce(
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
    350,
  );

  const result = useEmiCalculator(open ? input : null);

  // The share of everything repaid that is pure interest — the number that
  // actually lands when someone is choosing a tenure.
  const interestShare = result.data
    ? Math.round((result.data.totalInterest / result.data.totalPayable) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            EMI calculator
          </DialogTitle>
          <DialogDescription>
            What a loan would cost. Nothing here is saved — change the numbers and watch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="calcAmount">Loan amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {symbol}
                </span>
                <Input
                  id="calcAmount"
                  type="number"
                  inputMode="decimal"
                  step="1000"
                  min="0"
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
              <Label htmlFor="calcRate">Interest rate</Label>
              <div className="relative">
                <Input
                  id="calcRate"
                  type="number"
                  inputMode="decimal"
                  step="0.05"
                  min="0"
                  className="pr-8"
                  aria-invalid={!!errors.interestRate}
                  {...register('interestRate')}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              {errors.interestRate && (
                <p className="text-sm text-destructive">{errors.interestRate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="calcTenure">Tenure (months)</Label>
              <Input
                id="calcTenure"
                type="number"
                inputMode="numeric"
                step="6"
                min="1"
                aria-invalid={!!errors.tenureMonths}
                {...register('tenureMonths')}
              />
              {errors.tenureMonths && (
                <p className="text-sm text-destructive">{errors.tenureMonths.message}</p>
              )}
            </div>
          </div>

          {result.data && (
            <>
              <div
                className={cn(
                  'space-y-4 rounded-lg border bg-muted/40 p-4 transition-opacity',
                  result.isFetching && 'opacity-60',
                )}
              >
                <div>
                  <p className="text-sm text-muted-foreground">Monthly instalment</p>
                  <p className="text-3xl font-bold tabular-nums">
                    {format(result.data.monthlyEMI)}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Principal</p>
                    <p className="font-semibold tabular-nums">{format(result.data.loanAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total interest</p>
                    <p className="font-semibold tabular-nums">
                      {format(result.data.totalInterest)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total repayable</p>
                    <p className="font-semibold tabular-nums">{format(result.data.totalPayable)}</p>
                  </div>
                </div>

                {/* Principal against interest as one bar. The proportion is the
                    finding — a 30-year loan where more than half the bar is
                    interest makes the case that a total in figures does not. */}
                <div className="space-y-1.5">
                  <div
                    className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${100 - interestShare}% principal, ${interestShare}% interest`}
                  >
                    <div
                      className="h-full bg-[var(--chart-income)]"
                      style={{ width: `${100 - interestShare}%` }}
                    />
                    <div
                      className="h-full bg-[var(--chart-expense)]"
                      style={{ width: `${interestShare}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{interestShare}%</span> of
                    everything you repay is interest.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowSchedule((value) => !value)}
              >
                {showSchedule ? 'Hide' : 'Show'} the instalment-by-instalment breakdown
              </Button>

              {showSchedule && (
                <div className="max-h-72 overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      How each instalment splits between interest and principal
                    </caption>
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th scope="col" className="px-3 py-2 font-medium">#</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Payment</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Interest</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Principal</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.data.schedule.map((row) => (
                        <tr key={row.installment}>
                          <td className="px-3 py-2 text-muted-foreground">{row.installment}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {format(row.payment)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {format(row.interest)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {format(row.principal)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {format(row.closingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmiCalculatorDialog;

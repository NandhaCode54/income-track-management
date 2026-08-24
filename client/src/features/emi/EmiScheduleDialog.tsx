import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDate } from '@/utils/formatDate';
import EmiProgressBar from './EmiProgressBar';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_STYLES } from './emi.constants';
import { useEmi } from './emi.hooks';
import type { Emi } from '@/types/emi.types';

interface EmiScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emi: Emi | null;
}

type View = 'schedule' | 'breakdown';

/**
 * The loan's two schedules, side by side but not at once.
 *
 * **Payments** is the ledger — what is due, what was paid, what was missed.
 * **Interest split** is the maths — how much of each instalment is actually
 * reducing the debt. They line up instalment for instalment, and the second is
 * the one that explains why the first takes so long to move the balance.
 */
const EmiScheduleDialog = ({ open, onOpenChange, emi }: EmiScheduleDialogProps) => {
  const { format } = useCurrency();
  const [view, setView] = useState<View>('schedule');
  const detail = useEmi(open && emi ? emi.id : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{emi?.name ?? 'Loan'}</DialogTitle>
          <DialogDescription>
            {emi
              ? `${format(emi.loanAmount)} at ${emi.interestRate}% over ${emi.tenureMonths} months${
                  emi.lenderName ? ` · ${emi.lenderName}` : ''
                }`
              : null}
          </DialogDescription>
        </DialogHeader>

        {detail.isPending ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : detail.data ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-4">
              <Figure label="Instalment" value={format(detail.data.monthlyEMI)} />
              <Figure label="Total repayable" value={format(detail.data.totalPayable)} />
              <Figure label="Total interest" value={format(detail.data.totalInterest)} />
              <Figure label="Ends" value={formatDate(detail.data.endDate)} />
            </div>

            <EmiProgressBar progress={detail.data.progress} size="lg" />

            <div role="tablist" aria-label="Schedule view" className="flex rounded-lg border p-0.5">
              {(
                [
                  ['schedule', 'Payments'],
                  ['breakdown', 'Interest split'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => setView(id)}
                  className={cn(
                    'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    view === id
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-80 overflow-auto rounded-lg border">
              {view === 'schedule' ? (
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Every instalment of {detail.data.name}, with its due date and status
                  </caption>
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-3 py-2 font-medium">Due</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
                      <th scope="col" className="px-3 py-2 font-medium">Status</th>
                      <th scope="col" className="px-3 py-2 font-medium">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {detail.data.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-3 py-2">{formatDate(payment.dueDate)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {format(payment.amount)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-xs font-medium',
                              // `isOverdue` is derived against today, so a missed
                              // instalment reads as missed even before the nightly
                              // sweep has written the status.
                              payment.isOverdue
                                ? PAYMENT_STATUS_STYLES.OVERDUE
                                : PAYMENT_STATUS_STYLES[payment.status],
                            )}
                          >
                            {payment.isOverdue && payment.status === 'PENDING'
                              ? PAYMENT_STATUS_LABELS.OVERDUE
                              : PAYMENT_STATUS_LABELS[payment.status]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {payment.paidDate ? formatDate(payment.paidDate) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    How each instalment of {detail.data.name} splits between interest and principal
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
                    {detail.data.schedule.map((row) => (
                      <tr key={row.installment}>
                        <td className="px-3 py-2 text-muted-foreground">{row.installment}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{format(row.payment)}</td>
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
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const Figure = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold tabular-nums">{value}</p>
  </div>
);

export default EmiScheduleDialog;

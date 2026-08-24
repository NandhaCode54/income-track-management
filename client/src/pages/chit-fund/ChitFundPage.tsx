import { useState } from 'react';
import { CircleDollarSign, Loader2, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import type { ChitFund } from '@/types/chit-fund.types';
import { MONTH_NAMES } from '@/features/chit-fund/chit-fund.constants';
import { useChitFunds, useRemoveChitFund } from '@/features/chit-fund/chit-fund.hooks';
import ChitFundFormDialog from '@/features/chit-fund/ChitFundFormDialog';
import RecordChitPaymentDialog from '@/features/chit-fund/RecordChitPaymentDialog';

const ChitFundPage = () => {
  const { format } = useCurrency();
  const { can } = usePermission();

  const funds = useChitFunds();
  const removeFund = useRemoveChitFund();

  const [formOpen, setFormOpen] = useState(false);
  const [paying, setPaying] = useState<ChitFund | null>(null);
  const [deleting, setDeleting] = useState<ChitFund | null>(null);

  /** Most recent payments first — the month you just settled should lead. */
  const recentPayments = (fund: ChitFund) =>
    [...fund.payments].sort((a, b) => b.year - a.year || b.month - a.month).slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chit Funds"
        description="Track household chit commitments and each month's payment."
        actions={
          can('FINANCE_WRITE') ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Add chit fund
            </Button>
          ) : undefined
        }
      />

      {funds.isPending ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !funds.data?.length ? (
        <Card>
          <EmptyState
            icon={CircleDollarSign}
            title="No chit funds yet"
            description="Add a fund to track its monthly household payment."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {funds.data.map((fund) => (
            <Card key={fund.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{fund.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {fund.organizer ?? 'No organizer'} · {fund.totalMembers} members · due day{' '}
                      {fund.dueDay}
                    </p>
                  </div>
                  {can('FINANCE_DELETE') && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${fund.name}`}
                      onClick={() => setDeleting(fund)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-right font-medium">{format(fund.totalAmount)}</span>
                  <span className="text-muted-foreground">Monthly</span>
                  <span className="text-right font-medium">{format(fund.monthlyAmount)}</span>
                  <span className="text-muted-foreground">Paid so far</span>
                  <span className="text-right font-medium">{format(fund.paidAmount)}</span>
                  <span className="text-muted-foreground">Months paid</span>
                  <span className="text-right font-medium">
                    {fund.paidMonths} / {fund.totalMembers}
                  </span>
                </div>

                {/* Progress across the fund's lifetime, not a raw percentage of money. */}
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.min(
                          Math.round((fund.paidMonths / Math.max(fund.totalMembers, 1)) * 100),
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {recentPayments(fund).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {recentPayments(fund).map((payment) => (
                      <span
                        key={payment.id}
                        className="rounded-full border bg-muted/40 px-2 py-0.5 text-muted-foreground"
                      >
                        {MONTH_NAMES[payment.month - 1]} {payment.year} · {format(payment.amount)}
                      </span>
                    ))}
                  </div>
                )}

                {can('FINANCE_WRITE') && (
                  <Button className="w-full" variant="outline" onClick={() => setPaying(fund)}>
                    Record a monthly payment
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {can('FINANCE_WRITE') && (
        <>
          <ChitFundFormDialog open={formOpen} onOpenChange={setFormOpen} />
          <RecordChitPaymentDialog
            open={!!paying}
            onOpenChange={(open) => !open && setPaying(null)}
            fund={paying}
          />
        </>
      )}

      {can('FINANCE_DELETE') && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title="Delete this chit fund?"
          description={
            deleting
              ? `"${deleting.name}" and its ${deleting.payments.length} recorded month${
                  deleting.payments.length === 1 ? '' : 's'
                } will be removed for everyone in the family.`
              : undefined
          }
          confirmLabel="Delete"
          destructive
          loading={removeFund.isPending}
          onConfirm={() => {
            if (!deleting) return;
            removeFund.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
          }}
        />
      )}
    </div>
  );
};

export default ChitFundPage;

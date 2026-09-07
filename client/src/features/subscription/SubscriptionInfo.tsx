import { useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, CreditCard, Loader2, Wallet, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Subscription } from '@/types/subscription.types';
import { PLAN_LABELS, STATUS_LABELS, STATUS_VARIANTS } from '@/types/subscription.types';
import { useCancelSubscription, useDemoPay, useReactivateSubscription, useSubscriptionStatus } from './subscription.hooks';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface SubscriptionInfoProps {
  subscription: Subscription;
}

/** `null` percents the plan detail to "requested" — an upgrade intent awaiting payment. */
const formatAmount = (amount: number | null): string =>
  amount == null ? '' : `₹${amount.toLocaleString('en-IN')}`;

const SubscriptionInfo = ({ subscription }: SubscriptionInfoProps) => {
  const cancelMutation = useCancelSubscription();
  const reactivateMutation = useReactivateSubscription();
  const demoPayMutation = useDemoPay();
  const { data: planStatus } = useSubscriptionStatus();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const isPendingPayment = subscription.status === 'PENDING_PAYMENT';
  const demoMode = planStatus?.demoMode ?? false;

  const statusVariant = STATUS_VARIANTS[subscription.status];
  const isCancelled = subscription.status === 'CANCELLED';
  const isActive = subscription.status === 'ACTIVE' || subscription.status === 'TRIAL';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold">{PLAN_LABELS[subscription.plan]}</p>
            </div>
            <Badge variant={statusVariant}>{STATUS_LABELS[subscription.status]}</Badge>
          </div>

          {isPendingPayment && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {PLAN_LABELS[subscription.pendingPlan ?? subscription.plan]} upgrade requested
                    {subscription.pendingAmount ? ` — ${formatAmount(subscription.pendingAmount)} due` : ''}
                  </p>
                  <p className="text-amber-700">
                    Your current plan stays active until the payment is confirmed. A confirmation from
                    the payment provider activates it automatically.
                  </p>
                  {demoMode && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 border-amber-300 text-amber-800"
                      disabled={demoPayMutation.isPending}
                      onClick={() => demoPayMutation.mutate()}
                    >
                      {demoPayMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wallet className="mr-2 h-4 w-4" />
                      )}
                      Complete demo payment
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Started</p>
                <p className="text-sm">{format(new Date(subscription.startDate), 'MMM d, yyyy')}</p>
              </div>
            </div>

            {subscription.renewalDate && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isCancelled ? 'Expires' : 'Renews'}
                  </p>
                  <p className="text-sm">{format(new Date(subscription.renewalDate), 'MMM d, yyyy')}</p>
                </div>
              </div>
            )}

            {subscription.trialEndsAt && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Trial ends</p>
                  <p className="text-sm">{format(new Date(subscription.trialEndsAt), 'MMM d, yyyy')}</p>
                </div>
              </div>
            )}

            {subscription.cancelledAt && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                  <p className="text-sm">{format(new Date(subscription.cancelledAt), 'MMM d, yyyy')}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            {isActive && subscription.plan !== 'FREE' && (
              <Button
                variant="destructive"
                size="sm"
                disabled={cancelMutation.isPending}
                onClick={() => setShowCancelConfirm(true)}
              >
                {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel Subscription
              </Button>
            )}
            {isCancelled && (
              <Button
                size="sm"
                disabled={reactivateMutation.isPending}
                onClick={() => reactivateMutation.mutate()}
              >
                {reactivateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reactivate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel subscription?"
        description="Your subscription will remain active until the end of the current billing period. You can reactivate before it expires."
        confirmLabel="Cancel subscription"
        destructive
        loading={cancelMutation.isPending}
        onConfirm={() => {
          cancelMutation.mutate(undefined, { onSuccess: () => setShowCancelConfirm(false) });
        }}
      />
    </>
  );
};

export default SubscriptionInfo;

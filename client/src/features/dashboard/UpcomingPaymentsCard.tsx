import { AlertTriangle, CalendarCheck2, CircleDashed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/common/EmptyState';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/formatDate';
import { OBLIGATION_META, UPCOMING_PREVIEW_ROWS } from './dashboard.constants';
import type { UpcomingPayment, UpcomingPayments } from '@/types/dashboard.types';

interface UpcomingPaymentsCardProps {
  data?: UpcomingPayments;
  isLoading: boolean;
}

/** "Today" / "Tomorrow" / "in 4 days" / "8 days late" — the phrasing people use. */
const dueLabel = (item: UpcomingPayment): string => {
  const { daysUntilDue } = item;
  if (daysUntilDue === 0) return 'Due today';
  if (daysUntilDue === 1) return 'Due tomorrow';
  if (daysUntilDue > 1) return `Due in ${daysUntilDue} days`;
  return daysUntilDue === -1 ? '1 day late' : `${Math.abs(daysUntilDue)} days late`;
};

const PaymentRow = ({ item }: { item: UpcomingPayment }) => {
  const { format } = useCurrency();
  const meta = OBLIGATION_META[item.kind];
  const Icon = meta.icon;

  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            item.isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.label}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>{meta.label}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(item.dueDate)}</span>
            {item.detail && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{item.detail}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">{format(item.amount)}</p>
        {/* Overdue is stated in words with an icon, never by colour alone. */}
        <p
          className={cn(
            'mt-0.5 flex items-center justify-end gap-1 text-xs',
            item.isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground',
          )}
        >
          {item.isOverdue && <AlertTriangle aria-hidden className="h-3 w-3" />}
          {dueLabel(item)}
        </p>
        {/* A projected instalment is a reminder, not a recorded debt — say so. */}
        {item.isProjected && (
          <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <CircleDashed aria-hidden className="h-3 w-3" />
            Scheduled
          </p>
        )}
      </div>
    </li>
  );
};

/**
 * EMIs, bills, rent and school fees in one date-ordered feed.
 *
 * Measured from today rather than from the month selected above: a bill due on the
 * 2nd of next month is precisely what the last week of this month needs to see.
 * Anything already past due is pulled in ahead of it — an "upcoming payments" card
 * that hides an overdue bill would be worse than not having one.
 */
const UpcomingPaymentsCard = ({ data, isLoading }: UpcomingPaymentsCardProps) => {
  const { format } = useCurrency();

  const items = data?.items ?? [];
  const shown = items.slice(0, UPCOMING_PREVIEW_ROWS);
  const remaining = items.length - shown.length;
  const activeKinds = (data?.totals.byKind ?? []).filter((entry) => entry.count > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-lg">Upcoming payments</CardTitle>
            <CardDescription>
              {isLoading
                ? 'Loading…'
                : `${format(data?.totals.due ?? 0)} owed over the next ${data?.window.days ?? 30} days.`}
            </CardDescription>
          </div>

          {(data?.totals.overdueCount ?? 0) > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle aria-hidden className="h-3 w-3" />
              {data?.totals.overdueCount} overdue
            </Badge>
          )}
        </div>

        {activeKinds.length > 0 && (
          <p className="pt-1 text-xs text-muted-foreground">
            {activeKinds
              .map((entry) => `${entry.count} ${OBLIGATION_META[entry.kind].label.toLowerCase()}${entry.count === 1 ? '' : 's'}`)
              .join(' · ')}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-muted/40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title="Nothing due"
            description="No EMIs, bills, rent or school fees fall in the window. Add them from their own pages and they will show up here."
          />
        ) : (
          <>
            <ul className="divide-y">
              {shown.map((item) => (
                <PaymentRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </ul>

            {remaining > 0 && (
              <p className="pt-3 text-xs text-muted-foreground">
                {remaining} more {remaining === 1 ? 'payment' : 'payments'} in the window — open{' '}
                <Link className="underline underline-offset-2" to={OBLIGATION_META.BILL.to}>
                  Bills
                </Link>{' '}
                or{' '}
                <Link className="underline underline-offset-2" to={OBLIGATION_META.EMI.to}>
                  EMI
                </Link>{' '}
                to see them all.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingPaymentsCard;

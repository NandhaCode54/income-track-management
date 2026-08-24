import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDate } from '@/utils/formatDate';
import type { UpcomingEmi, UpcomingEmis } from '@/types/emi.types';

interface UpcomingEmiPanelProps {
  data?: UpcomingEmis;
  windowDays: number;
  canWrite: boolean;
  onRecordPayment: (item: UpcomingEmi) => void;
}

/** "in 4 days" / "today" / "9 days ago" — the phrasing a person would use. */
const whenLabel = (days: number): string => {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 0) return `in ${days} days`;
  return days === -1 ? 'yesterday' : `${Math.abs(days)} days ago`;
};

/**
 * What is owed next, across every loan.
 *
 * Missed instalments sort to the top and are stated in words as well as colour —
 * "9 days ago" is the whole message, and it survives being read in greyscale.
 */
const UpcomingEmiPanel = ({
  data,
  windowDays,
  canWrite,
  onRecordPayment,
}: UpcomingEmiPanelProps) => {
  const { format } = useCurrency();
  const items = data?.items ?? [];

  if (items.length === 0) return null;

  // Overdue first, then by date. The server already orders by date; this lifts
  // arrears above instalments that are merely due sooner.
  const ordered = [...items].sort(
    (a, b) => Number(b.isOverdue) - Number(a.isOverdue) || a.daysUntilDue - b.daysUntilDue,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="h-5 w-5" />
          Coming up
        </CardTitle>
        <CardDescription>
          {data?.totals.count} {data?.totals.count === 1 ? 'instalment' : 'instalments'} worth{' '}
          {format(data?.totals.due ?? 0)} within {windowDays} days
          {(data?.totals.overdueCount ?? 0) > 0 && (
            <>
              , including{' '}
              <span className="font-medium text-red-600 dark:text-red-400">
                {data?.totals.overdueCount} already missed
              </span>
            </>
          )}
          .
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <ul className="divide-y border-t">
          {ordered.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.emiName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.lenderName ? `${item.lenderName} · ` : ''}
                  {formatDate(item.dueDate)}
                  <span
                    className={cn(
                      'ml-1.5 font-medium',
                      item.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
                    )}
                  >
                    · {item.isOverdue ? 'missed ' : 'due '}
                    {whenLabel(item.daysUntilDue)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium tabular-nums">{format(item.amount)}</span>
                {canWrite && (
                  <Button variant="outline" size="sm" onClick={() => onRecordPayment(item)}>
                    Record
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default UpcomingEmiPanel;

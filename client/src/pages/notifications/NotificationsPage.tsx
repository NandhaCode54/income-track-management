import { useState } from 'react';
import { BellOff, CheckCheck } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import { Badge } from '@/components/ui/badge';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/notifications.hooks';
import { NOTIFICATION_TYPE_LABELS, type NotificationType } from '@/types/notifications.types';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict, parseISO, isValid } from 'date-fns';

type Filter = 'all' | 'unread';

const TONE_BY_TYPE: Record<NotificationType, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  EMI_DUE: 'warning',
  BILL_DUE: 'warning',
  RENT_DUE: 'warning',
  SCHOOL_FEE_DUE: 'warning',
  CHIT_DUE: 'warning',
  BUDGET_WARNING: 'warning',
  BUDGET_EXCEEDED: 'destructive',
  GOAL_ACHIEVED: 'success',
  GOAL_MILESTONE: 'success',
  INVITATION: 'secondary',
  SYSTEM: 'secondary',
  ANNOUNCEMENT: 'secondary',
};

const timeAgo = (value: string): string => {
  const date = parseISO(value);
  return isValid(date) ? `${formatDistanceToNowStrict(date)} ago` : '';
};

/**
 * The full feed behind the bell. Filters and pagination are local state; the
 * unread toggle maps to the API's `unreadOnly` query. Clicking an unread row
 * marks it read — there is no detail view to open.
 */
const NotificationsPage = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);

  const query = useNotifications({ page, unreadOnly: filter === 'unread' });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Payment reminders and budget alerts for this workspace.
          </p>
        </div>
        <button
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'unread'] as const).map((value) => (
          <button
            key={value}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors',
              filter === value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {items.length === 0 && !query.isLoading && (
          <div className="p-10">
            <EmptyState
              icon={BellOff}
              title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              description={
                filter === 'unread'
                  ? 'Everything has been read.'
                  : 'Reminders about upcoming payments will show up here.'
              }
            />
          </div>
        )}

        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (!item.isRead) markRead.mutate(item.id);
            }}
            className={cn(
              'flex w-full items-start justify-between gap-4 border-b border-border/60 px-4 py-4 text-left transition-colors last:border-b-0 sm:px-6',
              'hover:bg-accent/50',
              !item.isRead && 'bg-primary/5',
            )}
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                {!item.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                <span className={cn('text-sm', item.isRead ? 'font-normal' : 'font-semibold')}>
                  {item.title}
                </span>
                <Badge variant={TONE_BY_TYPE[item.type]} className="text-[10px] uppercase">
                  {NOTIFICATION_TYPE_LABELS[item.type]}
                </Badge>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
            </div>
            <span className="shrink-0 whitespace-nowrap pt-0.5 text-xs text-muted-foreground/80">
              {timeAgo(item.createdAt)}
            </span>
          </button>
        ))}
      </div>

      {meta && meta.total > 0 && (
        <Pagination meta={meta} onPageChange={setPage} label="notifications" />
      )}
    </div>
  );
};

export default NotificationsPage;

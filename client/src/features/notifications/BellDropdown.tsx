import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/features/notifications/notifications.hooks';
import { NOTIFICATION_TYPE_LABELS } from '@/types/notifications.types';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

/**
 * The bell lives in the topbar and opens a compact preview of the feed —
 * recent items plus a jump to the full page. The unread count is polled
 * separately so the badge stays live even while the dropdown is closed.
 */
const BellDropdown = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const unreadQuery = useUnreadCount();
  const preview = useNotifications({ page: 1 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unread = unreadQuery.data ?? 0;
  const items = preview.data?.items.slice(0, 8) ?? [];

  const handleNavigate = (): void => {
    setOpen(false);
    navigate(ROUTES.NOTIFICATIONS);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg p-2 hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">
                Notifications
                {unread > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {unread} unread
                  </span>
                )}
              </p>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  You're all caught up.
                </p>
              )}
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.isRead) markRead.mutate(item.id);
                    handleNavigate();
                  }}
                  className={cn(
                    'block w-full border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/50',
                    !item.isRead && 'bg-primary/5',
                  )}
                >
                  <p className="flex items-center gap-2">
                    {!item.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    <span className={cn('text-sm', item.isRead ? 'font-normal' : 'font-medium')}>
                      {item.title}
                    </span>
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/70">
                    {NOTIFICATION_TYPE_LABELS[item.type]}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={handleNavigate}
              className="block w-full border-t border-border px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-accent/50"
            >
              View all notifications
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BellDropdown;

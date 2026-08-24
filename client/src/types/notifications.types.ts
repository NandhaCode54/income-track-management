export const NOTIFICATION_TYPES = [
  'EMI_DUE',
  'BILL_DUE',
  'RENT_DUE',
  'SCHOOL_FEE_DUE',
  'CHIT_DUE',
  'BUDGET_EXCEEDED',
  'BUDGET_WARNING',
  'GOAL_ACHIEVED',
  'GOAL_MILESTONE',
  'INVITATION',
  'SYSTEM',
  'ANNOUNCEMENT',
] as const;

/** Local mirror of the server's Prisma enum — the client cannot import it. */
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationsQuery {
  unreadOnly?: boolean;
  page?: number;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  EMI_DUE: 'Loan EMI',
  BILL_DUE: 'Bill',
  RENT_DUE: 'Rent',
  SCHOOL_FEE_DUE: 'School fee',
  CHIT_DUE: 'Chit fund',
  BUDGET_EXCEEDED: 'Budget exceeded',
  BUDGET_WARNING: 'Budget warning',
  GOAL_ACHIEVED: 'Goal achieved',
  GOAL_MILESTONE: 'Goal milestone',
  INVITATION: 'Invitation',
  SYSTEM: 'System',
  ANNOUNCEMENT: 'Announcement',
};

import type { NotificationType } from '@prisma/client';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface ListNotificationsQuery {
  unreadOnly?: boolean;
  page: number;
  perPage: number;
}

/**
 * One fan-out unit: a job decides *what* to say and builds one row per
 * recipient; the dispatcher persists them and sends the email digest.
 */
export interface NotificationRow {
  familyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

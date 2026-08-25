import type { UserRole } from '@/types/auth.types';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  families: { id: string; name: string; role: UserRole }[];
}

export interface AdminFamily {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  tenant: { id: string; name: string; plan: string };
  members: {
    id: string;
    user: { id: string; firstName: string; lastName: string; email: string };
    role: UserRole;
  }[];
  subscription: { plan: string; status: string } | null;
  _count: { incomes: number; expenses: number; members: number };
}

export interface AdminAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldData: unknown;
  newData: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
  family: { id: string; name: string } | null;
}

export interface AdminSubscription {
  id: string;
  plan: string;
  status: string;
  startDate: string;
  renewalDate: string | null;
  cancelledAt: string | null;
  trialEndsAt: string | null;
  family: { id: string; name: string; code: string };
}

export interface AdminAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalFamilies: number;
  activeFamilies: number;
  totalSubscriptions: number;
  planBreakdown: { plan: string; count: number }[];
  recentSignups: { date: string; count: number }[];
  totalIncome: number;
  totalExpenses: number;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string; email: string };
}

export interface ListUsersQuery {
  page: number;
  perPage?: number;
  search?: string;
  isActive?: boolean;
}

export interface ListFamiliesQuery {
  page: number;
  perPage?: number;
  search?: string;
  plan?: string;
}

export interface ListAuditLogsQuery {
  page: number;
  perPage?: number;
  action?: string;
  entity?: string;
  userId?: string;
  familyId?: string;
}

export interface ListSubscriptionsQuery {
  page: number;
  perPage?: number;
  plan?: string;
  status?: string;
}

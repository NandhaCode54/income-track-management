import type { UserRole, PlanType, SubscriptionStatus, AuditAction } from '@prisma/client';

export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  families: { id: string; name: string; role: UserRole }[];
}

export interface AdminFamilyDto {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
  tenant: { id: string; name: string; plan: PlanType };
  members: { id: string; user: { id: string; firstName: string; lastName: string; email: string }; role: UserRole }[];
  subscription: { plan: PlanType; status: SubscriptionStatus } | null;
  _count: { incomes: number; expenses: number; members: number };
}

export interface AdminAuditLogDto {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  oldData: unknown;
  newData: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
  family: { id: string; name: string } | null;
}

export interface AdminSubscriptionDto {
  id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  startDate: Date;
  renewalDate: Date | null;
  cancelledAt: Date | null;
  trialEndsAt: Date | null;
  family: { id: string; name: string; code: string };
}

export interface AdminAnalyticsDto {
  totalUsers: number;
  activeUsers: number;
  totalFamilies: number;
  activeFamilies: number;
  totalSubscriptions: number;
  planBreakdown: { plan: PlanType; count: number }[];
  recentSignups: { date: string; count: number }[];
  totalIncome: number;
  totalExpenses: number;
}

export interface AdminAnnouncementDto {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  author: { id: string; firstName: string; lastName: string; email: string };
}

export interface ListUsersQuery {
  page: number;
  perPage: number;
  search?: string;
  isActive?: boolean;
}

export interface ListFamiliesQuery {
  page: number;
  perPage: number;
  search?: string;
  plan?: PlanType;
}

export interface ListAuditLogsQuery {
  page: number;
  perPage: number;
  action?: AuditAction;
  entity?: string;
  userId?: string;
  familyId?: string;
}

export interface ListSubscriptionsQuery {
  page: number;
  perPage: number;
  plan?: PlanType;
  status?: SubscriptionStatus;
}

import { prisma } from '../../config/database';
import type {
  ListUsersQuery,
  ListFamiliesQuery,
  ListAuditLogsQuery,
  ListSubscriptionsQuery,
} from './admin.types';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  isVerified: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  familyMembers: {
    select: {
      id: true,
      familyId: true,
      role: true,
      family: { select: { id: true, name: true } },
    },
  },
} as const;

const familySelect = {
  id: true,
  name: true,
  code: true,
  isActive: true,
  createdAt: true,
  tenant: { select: { id: true, name: true, plan: true } },
  members: {
    select: {
      id: true,
      role: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
  subscription: { select: { plan: true, status: true } },
  _count: { select: { incomes: true, expenses: true, members: true } },
} as const;

const auditLogSelect = {
  id: true,
  action: true,
  entity: true,
  entityId: true,
  oldData: true,
  newData: true,
  ip: true,
  userAgent: true,
  createdAt: true,
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  family: { select: { id: true, name: true } },
} as const;

export const adminRepository = {
  // ─── Users ────────────────────────────────────────────────────────────────

  listUsers(query: ListUsersQuery) {
    const where = {
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    return prisma.$transaction([
      prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.user.count({ where }),
    ]);
  },

  getUser(id: string) {
    return prisma.user.findUnique({ where: { id }, select: userSelect });
  },

  setUserStatus(id: string, isActive: boolean) {
    return prisma.user.update({ where: { id }, data: { isActive } });
  },

  // ─── Families ─────────────────────────────────────────────────────────────

  listFamilies(query: ListFamiliesQuery) {
    const where = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { code: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.plan ? { tenant: { plan: query.plan } } : {}),
    };

    return prisma.$transaction([
      prisma.family.findMany({
        where,
        select: familySelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.family.count({ where }),
    ]);
  },

  getFamily(id: string) {
    return prisma.family.findUnique({ where: { id }, select: familySelect });
  },

  // ─── Subscriptions ────────────────────────────────────────────────────────

  listSubscriptions(query: ListSubscriptionsQuery) {
    const where = {
      ...(query.plan ? { plan: query.plan } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    return prisma.$transaction([
      prisma.subscription.findMany({
        where,
        select: {
          id: true,
          plan: true,
          status: true,
          startDate: true,
          renewalDate: true,
          cancelledAt: true,
          trialEndsAt: true,
          family: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.subscription.count({ where }),
    ]);
  },

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  listAuditLogs(query: ListAuditLogsQuery) {
    const where = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.familyId ? { familyId: query.familyId } : {}),
    };

    return prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        select: auditLogSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.auditLog.count({ where }),
    ]);
  },

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getAnalytics() {
    const [
      totalUsers,
      activeUsers,
      totalFamilies,
      activeFamilies,
      totalSubscriptions,
      planBreakdown,
      recentSignups,
      incomeAgg,
      expenseAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.family.count(),
      prisma.family.count({ where: { isActive: true } }),
      prisma.subscription.count(),
      prisma.subscription.groupBy({ by: ['plan'], _count: true }),
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE_TRUNC('day', "createdAt")::text AS date, COUNT(*) AS count
        FROM users
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date DESC
      `,
      prisma.income.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalFamilies,
      activeFamilies,
      totalSubscriptions,
      planBreakdown: planBreakdown.map((p) => ({ plan: p.plan, count: p._count })),
      recentSignups: recentSignups.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
      totalIncome: Number(incomeAgg._sum.amount ?? 0),
      totalExpenses: Number(expenseAgg._sum.amount ?? 0),
    };
  },

  // ─── Announcements ────────────────────────────────────────────────────────

  createAnnouncement(data: { title: string; message: string; createdBy: string }) {
    return prisma.announcement.create({
      data,
      select: {
        id: true,
        title: true,
        message: true,
        createdAt: true,
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  },

  listAnnouncements() {
    return prisma.announcement.findMany({
      select: {
        id: true,
        title: true,
        message: true,
        createdAt: true,
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },
};

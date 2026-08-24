import { NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { dispatchNotifications } from '../modules/notifications/notification.service';
import type { NotificationRow } from '../modules/notifications/notification.types';
import { periodRange } from '../shared/utils/date.util';
import { logger } from '../shared/utils/logger';
import { activeMemberUserIds, alreadyNotified } from './reminder.helpers';

/**
 * The daily budget sweep. For the current month it compares every budget line
 * — per-category and the overall line — against actual spend and raises:
 *
 * - `BUDGET_WARNING`  at 85% of the limit,
 * - `BUDGET_EXCEEDED` past the limit.
 *
 * Dedupe is one alert per budget line per month per kind, keyed as
 * `<budgetId>:<WARNING|EXCEEDED>` inside the notification metadata. A budget is
 * month-scoped by its unique constraint, so its id alone already pins the
 * month — no extra date math in the key.
 *
 * In-app only, deliberately: budget state changes daily as expenses land, so a
 * mail per crossing would train people to ignore the inbox. The bell says it
 * once; the budgets page says it continuously.
 */

const WARNING_THRESHOLD = 0.85;

const formatMoney = (value: unknown): string =>
  Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });

interface Alert {
  familyId: string;
  /** Stable dedupe key: `<budgetId>:<kind>`. */
  alertKey: string;
  type: Extract<NotificationType, 'BUDGET_WARNING' | 'BUDGET_EXCEEDED'>;
  title: string;
  message: string;
}

const spendByCategory = async (
  familyId: string,
  from: Date,
  to: Date,
): Promise<Map<string | null, number>> => {
  const groups = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: { familyId, date: { gte: from, lte: to } },
    _sum: { amount: true },
  });

  const totals = new Map<string | null, number>();
  let all = 0;
  for (const group of groups) {
    const value = Number(group._sum.amount ?? 0);
    totals.set(group.categoryId, value);
    all += value;
  }
  totals.set(null, all);

  return totals;
};

const evaluateBudgets = async (): Promise<Alert[]> => {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  const { from, to } = periodRange({ year, month });

  const budgets = await prisma.budget.findMany({
    where: { month, year },
    select: {
      id: true,
      familyId: true,
      categoryId: true,
      amount: true,
      category: { select: { name: true } },
    },
  });
  if (budgets.length === 0) return [];

  const familyIds = [...new Set(budgets.map((b) => b.familyId))];
  const spendMaps = new Map<string, Map<string | null, number>>();
  for (const familyId of familyIds) {
    spendMaps.set(familyId, await spendByCategory(familyId, from, to));
  }

  const alerts: Alert[] = [];
  for (const budget of budgets) {
    const limit = Number(budget.amount);
    if (limit <= 0) continue;

    // An overall line (categoryId null) is measured against every expense in
    // the month, which the spend map carries under null.
    const spent = spendMaps.get(budget.familyId)?.get(budget.categoryId) ?? 0;

    const label =
      budget.category?.name ?? (budget.categoryId === null ? 'Overall budget' : 'Budget');
    if (spent > limit) {
      alerts.push({
        familyId: budget.familyId,
        alertKey: `${budget.id}:EXCEEDED`,
        type: NotificationType.BUDGET_EXCEEDED,
        title: `${label} over budget`,
        message: `${formatMoney(spent)} spent against a ${formatMoney(limit)} limit.`,
      });
    } else if (spent >= limit * WARNING_THRESHOLD) {
      alerts.push({
        familyId: budget.familyId,
        alertKey: `${budget.id}:WARNING`,
        type: NotificationType.BUDGET_WARNING,
        title: `${label} nearing its limit`,
        message: `${formatMoney(spent)} of ${formatMoney(limit)} used this month.`,
      });
    }
  }

  return alerts;
};

export const runBudgetAlerts = async (): Promise<number> => {
  const alerts = await evaluateBudgets();
  if (alerts.length === 0) return 0;

  const notified = await alreadyNotified(
    [NotificationType.BUDGET_WARNING, NotificationType.BUDGET_EXCEEDED],
    'budgetKey',
    alerts.map((alert) => alert.alertKey),
  );
  const pending = alerts.filter((alert) => !notified.has(alert.alertKey));
  if (pending.length === 0) return 0;

  const byFamily = await activeMemberUserIds([...new Set(pending.map((a) => a.familyId))]);

  const rows: NotificationRow[] = pending.flatMap((alert) =>
    (byFamily.get(alert.familyId) ?? []).map((userId) => ({
      familyId: alert.familyId,
      userId,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      metadata: { budgetKey: alert.alertKey },
    })),
  );

  await dispatchNotifications(rows);
  logger.info(`Budget sweep: ${pending.length} alert(s) to ${rows.length} recipient(s)`);

  return rows.length;
};

/** Fire-and-forget wrapper: a failed sweep must never take the process down. */
export const budgetAlertTask = (): void => {
  void runBudgetAlerts().catch((error) => logger.error('Budget alert job failed', { error }));
};

import { NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { emiRepository } from '../modules/emi/emi.repository';
import { REMINDER_LEAD_DAYS } from '../modules/emi/emi.types';
import { dispatchNotifications } from '../modules/notifications/notification.service';
import type { NotificationRow } from '../modules/notifications/notification.types';
import {
  addDaysUtc,
  endOfDayUtc,
  startOfTodayUtc,
} from '../shared/utils/date.util';
import { logger } from '../shared/utils/logger';
import { activeMemberUserIds, alreadyNotified, describeWhen } from './reminder.helpers';

/**
 * The daily EMI sweep. Two jobs in one pass, because both need the same reading
 * of "today" and running them apart would let an instalment be reminded about in
 * one state and marked overdue in another.
 *
 * 1. **Flip missed instalments to `OVERDUE`.** The DTO derives `isOverdue` on
 *    read, so screens are never stale — but a *stored* status is what lets a
 *    query filter for arrears without loading every row and comparing dates.
 *    The job is what keeps the column honest between reads.
 *
 * 2. **Raise `EMI_DUE` notifications** for instalments falling due within the
 *    next few days, and for ones already missed.
 *
 * This is the only code in the app that reads across **every** family, because a
 * cron tick has no request, no actor and no active workspace. It is confined to
 * this file and the clearly-marked cross-family section of `emi.repository`.
 */

const formatMoney = (value: unknown): string =>
  Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const runEmiReminders = async (): Promise<{ marked: number; notified: number }> => {
  const today = startOfTodayUtc();

  // Strictly before today: an instalment due *today* is not late yet.
  const { count: marked } = await emiRepository.markOverdue(today);

  /*
   * The window looks back as well as forward for the same reason the dashboard's
   * does — a missed instalment is the most urgent thing there is, and it would
   * otherwise never be notified at all if the day it fell due happened to be
   * missed by the job (a deploy, a restart, a machine asleep).
   */
  const due = await emiRepository.dueForReminder(
    addDaysUtc(today, -REMINDER_LEAD_DAYS),
    endOfDayUtc(addDaysUtc(today, REMINDER_LEAD_DAYS)),
  );

  if (due.length === 0) {
    if (marked > 0) logger.info(`EMI sweep: ${marked} instalment(s) marked overdue`);
    return { marked, notified: 0 };
  }

  const notified = await alreadyNotified(
    [NotificationType.EMI_DUE],
    'emiPaymentId',
    due.map((row) => row.id),
  );
  const pending = due.filter((row) => !notified.has(row.id));

  if (pending.length === 0) return { marked, notified: 0 };

  const byFamily = await activeMemberUserIds([...new Set(pending.map((row) => row.emi.familyId))]);

  const rows: NotificationRow[] = pending.flatMap((payment) => {
    const userIds = byFamily.get(payment.emi.familyId) ?? [];
    if (userIds.length === 0) return [];

    const { days } = describeWhen(today, payment.dueDate);
    const isOverdue = days < 0;

    const lender = payment.emi.lenderName ? ` (${payment.emi.lenderName})` : '';
    const when = isOverdue
      ? `${Math.abs(days)} day(s) ago`
      : days === 0
        ? 'today'
        : `in ${days} day(s)`;

    return userIds.map((userId) => ({
      familyId: payment.emi.familyId,
      userId,
      type: NotificationType.EMI_DUE,
      title: isOverdue ? `Missed EMI: ${payment.emi.name}` : `EMI due ${when}: ${payment.emi.name}`,
      message: `${formatMoney(payment.amount)} was due ${when}${lender}.`,
      metadata: {
        emiId: payment.emi.id,
        emiPaymentId: payment.id,
        dueDate: payment.dueDate.toISOString(),
        amount: Number(payment.amount),
      },
    }));
  });

  const notifiedCount = await dispatchNotifications(rows, { email: true });

  logger.info(
    `EMI sweep: ${marked} marked overdue, ${pending.length} instalment(s) notified to ${notifiedCount} recipient(s)`,
  );

  return { marked, notified: pending.length };
};

/** Fire-and-forget wrapper: a failed sweep must never take the process down. */
export const emiReminderTask = (): void => {
  void runEmiReminders().catch((error) => logger.error('EMI reminder job failed', { error }));
};

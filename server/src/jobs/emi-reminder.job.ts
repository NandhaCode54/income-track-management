import { NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { emiRepository } from '../modules/emi/emi.repository';
import { REMINDER_LEAD_DAYS } from '../modules/emi/emi.types';
import {
  addDaysUtc,
  endOfDayUtc,
  startOfTodayUtc,
  wholeDaysBetween,
} from '../shared/utils/date.util';
import { logger } from '../shared/utils/logger';

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

/**
 * One notification per instalment, ever — the same guard the budget alerts use,
 * keyed on the payment id.
 *
 * Without it, a loan that goes unpaid raises a fresh notification every single
 * day until it is settled, which is how a notification bell becomes something
 * people stop opening. The reminder is a nudge, not a nag; if it is ignored, the
 * overdue count on the loan is what keeps saying so.
 */
const alreadyNotified = async (paymentIds: string[]): Promise<Set<string>> => {
  if (paymentIds.length === 0) return new Set();

  /*
   * Asked as "which of *these* instalments have been notified", not "give me
   * every EMI notification". The second reads the whole table, and since nothing
   * ever deletes a notification it gets slower every day the app is alive — a
   * daily job that degrades with age is a nasty thing to leave behind. The OR is
   * bounded by the reminder window, which is a handful of days wide.
   */
  const existing = await prisma.notification.findMany({
    where: {
      type: NotificationType.EMI_DUE,
      OR: paymentIds.map((id) => ({ metadata: { path: ['emiPaymentId'], equals: id } })),
    },
    select: { metadata: true },
  });

  const notified = new Set<string>();
  for (const row of existing) {
    const id = (row.metadata as { emiPaymentId?: string } | null)?.emiPaymentId;
    if (id) notified.add(id);
  }

  return notified;
};

/** Everyone active in the family — an EMI is a household obligation, not one person's. */
const activeMemberUserIds = async (familyIds: string[]): Promise<Map<string, string[]>> => {
  const members = await prisma.familyMember.findMany({
    where: { familyId: { in: familyIds }, isActive: true },
    select: { familyId: true, userId: true },
  });

  const byFamily = new Map<string, string[]>();
  for (const member of members) {
    const existing = byFamily.get(member.familyId) ?? [];
    if (!existing.includes(member.userId)) existing.push(member.userId);
    byFamily.set(member.familyId, existing);
  }

  return byFamily;
};

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

  const notified = await alreadyNotified(due.map((row) => row.id));
  const pending = due.filter((row) => !notified.has(row.id));

  if (pending.length === 0) return { marked, notified: 0 };

  const byFamily = await activeMemberUserIds([...new Set(pending.map((row) => row.emi.familyId))]);

  const notifications = pending.flatMap((payment) => {
    const userIds = byFamily.get(payment.emi.familyId) ?? [];
    if (userIds.length === 0) return [];

    const days = wholeDaysBetween(today, payment.dueDate);
    const isOverdue = days < 0;
    const when =
      days === 0 ? 'today' : isOverdue ? `${Math.abs(days)} day(s) ago` : `in ${days} day(s)`;

    const lender = payment.emi.lenderName ? ` (${payment.emi.lenderName})` : '';

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

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  logger.info(
    `EMI sweep: ${marked} marked overdue, ${pending.length} instalment(s) notified to ${notifications.length} recipient(s)`,
  );

  return { marked, notified: pending.length };
};

/** Fire-and-forget wrapper: a failed sweep must never take the process down. */
export const emiReminderTask = (): void => {
  void runEmiReminders().catch((error) => logger.error('EMI reminder job failed', { error }));
};

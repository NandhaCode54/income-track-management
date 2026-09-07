import { NotificationType, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { dispatchNotifications } from '../modules/notifications/notification.service';
import type { NotificationRow } from '../modules/notifications/notification.types';
import { REMINDER_LEAD_DAYS } from '../modules/emi/emi.types';
import {
  addDaysUtc,
  dueDateInMonth,
  endOfDayUtc,
  startOfTodayUtc,
} from '../shared/utils/date.util';
import { logger } from '../shared/utils/logger';
import { activeMemberUserIds, alreadyNotified, describeWhen } from './reminder.helpers';

/**
 * The daily sweep for the *periodic* payments — bills, rent, school fees and
 * chit-fund instalments. (EMIs have their own sweep; loans needed an overdue
 * flip that these ledgers do not.)
 *
 * Every ledger answers the same question — "what is unsettled and falls within
 * ±REMINDER_LEAD_DAYS of today?" — so each collector projects its rows into one
 * common `DueItem` shape and a single dedupe + fan-out handles all of them.
 * Notifications carry `entityId` in metadata, which is what `alreadyNotified`
 * matches on: one reminder per bill / fee / month, ever.
 *
 * Emails ride along (`{ email: true }`) — this is the plan's "email reminders",
 * delivered as one digest per user rather than one mail per item.
 */

const formatMoney = (value: unknown): string =>
  Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** PARTIAL means some money went in but an obligation is still open — it stays unsettled. */
const UNSETTLED: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.OVERDUE,
  PaymentStatus.PARTIAL,
];
const SETTLED: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.WAIVED];

const NOTIFICATION_TYPES = [
  NotificationType.BILL_DUE,
  NotificationType.RENT_DUE,
  NotificationType.SCHOOL_FEE_DUE,
  NotificationType.CHIT_DUE,
];

interface DueItem {
  familyId: string;
  /** Stable id the dedupe check keys on (cuid, or fundId + month). */
  entityId: string;
  type: NotificationType;
  title: string;
  message: string;
}

const collectBillItems = async (from: Date, to: Date): Promise<DueItem[]> => {
  const bills = await prisma.bill.findMany({
    where: { dueDate: { gte: from, lte: to }, status: { in: UNSETTLED } },
    select: {
      id: true,
      familyId: true,
      name: true,
      providerName: true,
      amount: true,
      dueDate: true,
    },
  });

  const today = startOfTodayUtc();
  return bills.map((bill) => {
    const { phrase } = describeWhen(today, bill.dueDate);
    const provider = bill.providerName ? ` (${bill.providerName})` : '';
    return {
      familyId: bill.familyId,
      entityId: bill.id,
      type: NotificationType.BILL_DUE,
      title: `Bill due ${phrase}: ${bill.name}`,
      message: `${formatMoney(bill.amount)} is due ${phrase}${provider}.`,
    };
  });
};

const collectRentItems = async (from: Date, to: Date): Promise<DueItem[]> => {
  const rents = await prisma.rent.findMany({
    where: { dueDate: { gte: from, lte: to }, status: { in: UNSETTLED } },
    select: {
      id: true,
      familyId: true,
      propertyName: true,
      amount: true,
      month: true,
      year: true,
      dueDate: true,
    },
  });

  const today = startOfTodayUtc();
  return rents.map((rent) => {
    const { phrase } = describeWhen(today, rent.dueDate);
    return {
      familyId: rent.familyId,
      entityId: rent.id,
      type: NotificationType.RENT_DUE,
      title: `Rent for ${rent.month}/${rent.year} due ${phrase}`,
      message: `${formatMoney(rent.amount)} rent for ${rent.propertyName} is due ${phrase}.`,
    };
  });
};

const collectSchoolFeeItems = async (from: Date, to: Date): Promise<DueItem[]> => {
  const fees = await prisma.schoolFee.findMany({
    where: { dueDate: { gte: from, lte: to }, status: { in: UNSETTLED } },
    select: {
      id: true,
      familyId: true,
      studentName: true,
      school: true,
      term: true,
      amount: true,
      dueDate: true,
    },
  });

  const today = startOfTodayUtc();
  return fees.map((fee) => {
    const { phrase } = describeWhen(today, fee.dueDate);
    const term = fee.term ? ` (${fee.term})` : '';
    return {
      familyId: fee.familyId,
      entityId: fee.id,
      type: NotificationType.SCHOOL_FEE_DUE,
      title: `School fee due ${phrase}: ${fee.studentName}`,
      message: `${formatMoney(fee.amount)}${term} at ${fee.school} is due ${phrase}.`,
    };
  });
};

/**
 * Chit funds store payments per month, not per due date, so "unsettled" has to
 * be derived: walk each active fund's months that overlap the window, keep the
 * ones without a settled payment row, and derive their due date from the
 * fund's `dueDay`.
 */
const collectChitItems = async (from: Date, to: Date): Promise<DueItem[]> => {
  const funds = await prisma.chitFund.findMany({
    where: { isActive: true, startDate: { lte: to }, endDate: { gte: from } },
    select: {
      id: true,
      familyId: true,
      name: true,
      monthlyAmount: true,
      startDate: true,
      endDate: true,
      dueDay: true,
      payments: { where: { status: { in: SETTLED } }, select: { month: true, year: true } },
    },
  });

  const today = startOfTodayUtc();
  const items: DueItem[] = [];

  for (const fund of funds) {
    const paidMonths = new Set(fund.payments.map((p) => `${p.year}-${p.month}`));

    // Start at whichever comes later: the fund's first month or the window's.
    const startYear = fund.startDate > from ? fund.startDate.getUTCFullYear() : from.getUTCFullYear();
    const startMonth =
      fund.startDate > from ? fund.startDate.getUTCMonth() : from.getUTCMonth();
    // Stop at whichever comes earlier: the fund's last month or the window's.
    const endBoundary = fund.endDate < to ? fund.endDate : to;

    let cursor = new Date(Date.UTC(startYear, startMonth, 1));
    while (cursor <= endBoundary) {
      const year = cursor.getUTCFullYear();
      const month = cursor.getUTCMonth() + 1;
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));

      if (paidMonths.has(`${year}-${month}`)) continue;

      const dueDate = dueDateInMonth(year, month, fund.dueDay);
      if (dueDate < from || dueDate > to) continue;

      const { phrase } = describeWhen(today, dueDate);
      items.push({
        familyId: fund.familyId,
        entityId: `${fund.id}:${year}-${month}`,
        type: NotificationType.CHIT_DUE,
        title: `Chit instalment due ${phrase}: ${fund.name}`,
        message: `${formatMoney(fund.monthlyAmount)} for ${month}/${year} is due ${phrase}.`,
      });
    }
  }

  return items;
};

export const runPaymentReminders = async (): Promise<number> => {
  const today = startOfTodayUtc();
  /*
   * The window looks back as well as forward — a missed due date must still be
   * reminded about even if the day it fell due was missed by the job (a deploy,
   * a restart, a machine asleep).
   */
  const from = addDaysUtc(today, -REMINDER_LEAD_DAYS);
  const to = endOfDayUtc(addDaysUtc(today, REMINDER_LEAD_DAYS));

  const items = [
    ...(await collectBillItems(from, to)),
    ...(await collectRentItems(from, to)),
    ...(await collectSchoolFeeItems(from, to)),
    ...(await collectChitItems(from, to)),
  ];

  if (items.length === 0) return 0;

  const notified = await alreadyNotified(
    NOTIFICATION_TYPES,
    'entityId',
    items.map((item) => item.entityId),
  );
  const pending = items.filter((item) => !notified.has(item.entityId));
  if (pending.length === 0) return 0;

  const byFamily = await activeMemberUserIds([...new Set(pending.map((i) => i.familyId))]);

  const rows: NotificationRow[] = pending.flatMap((item) =>
    (byFamily.get(item.familyId) ?? []).map((userId) => ({
      familyId: item.familyId,
      userId,
      type: item.type,
      title: item.title,
      message: item.message,
      metadata: { entityId: item.entityId },
    })),
  );

  await dispatchNotifications(rows, { email: true });
  logger.info(
    `Payment sweep: ${pending.length} item(s) notified to ${rows.length} recipient(s)`,
  );

  return rows.length;
};

/** Fire-and-forget wrapper: a failed sweep must never take the process down. */
export const paymentReminderTask = (): void => {
  void runPaymentReminders().catch((error) =>
    logger.error('Payment reminder job failed', { error }),
  );
};

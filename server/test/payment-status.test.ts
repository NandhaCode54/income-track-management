import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationType, PaymentStatus, type PrismaPromise } from '@prisma/client';

vi.mock('../src/config/database', async () => {
  const { createPrismaMock } = await import('./helpers/mock-db');
  return { prisma: createPrismaMock() };
});

vi.mock('../src/modules/notifications/notification.service', () => ({
  dispatchNotifications: vi.fn(),
}));

import { prisma } from '../src/config/database';
import { dispatchNotifications } from '../src/modules/notifications/notification.service';
import { resetPrismaMocks } from './helpers/mock-db';
import { runPaymentReminders } from '../src/jobs/payment-reminder.job';
import { addDaysUtc, startOfTodayUtc } from '../src/shared/utils/date.util';

type PrismaMock = typeof prisma;

describe('payment reminder sweep — settlement classification', () => {
  beforeEach(() => {
    resetPrismaMocks(prisma);
    (dispatchNotifications as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('queries bills with PARTIAL treated as unsettled (PENDING, OVERDUE, PARTIAL)', async () => {
    (prisma.bill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.rent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.schoolFee.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.chitFund.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await runPaymentReminders();

    expect(prisma.bill.findMany).toHaveBeenCalledTimes(1);
    const where = (prisma.bill.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(where.status.in).toEqual([PaymentStatus.PENDING, PaymentStatus.OVERDUE, PaymentStatus.PARTIAL]);
    expect(where.status.in).not.toContain(PaymentStatus.PAID);
    expect(where.status.in).not.toContain(PaymentStatus.WAIVED);
  });

  it('fires a BILL_DUE reminder for a PARTIAL bill inside the window', async () => {
    const due = addDaysUtc(startOfTodayUtc(), 2);
    (prisma.bill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'bill-partial',
        familyId: 'f-1',
        name: 'Internet',
        providerName: 'Airtel',
        amount: 999,
        dueDate: due,
      },
    ]);
    (prisma.rent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.schoolFee.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.chitFund.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // No prior notification → not deduped.
    (prisma.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.familyMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { familyId: 'f-1', userId: 'user-a' },
    ]);

    const sent = await runPaymentReminders();

    expect(sent).toBeGreaterThan(0);
    const rows = (dispatchNotifications as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      familyId: 'f-1',
      userId: 'user-a',
      type: NotificationType.BILL_DUE,
      metadata: { entityId: 'bill-partial' },
    });
  });

  it('does not remind for a bill already settled (PAID) — the sweep never sees settled rows', async () => {
    // Simulate the DB filtering out the PAID bill: the ledger returns nothing for
    // it, so nothing is dispatched.
    (prisma.bill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.rent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.schoolFee.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.chitFund.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const sent = await runPaymentReminders();

    expect(sent).toBe(0);
    expect(dispatchNotifications).not.toHaveBeenCalled();
  });
});
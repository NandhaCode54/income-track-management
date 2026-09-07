import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Frequency, IncomeType } from '@prisma/client';

vi.mock('../src/config/database', async () => {
  const { createPrismaMock } = await import('./helpers/mock-db');
  return { prisma: createPrismaMock() };
});

import { prisma } from '../src/config/database';
import { resetPrismaMocks } from './helpers/mock-db';
import { runRecurringOccurrences } from '../src/jobs/recurring-occurrence.job';
import { addDaysUtc, startOfTodayUtc } from '../src/shared/utils/date.util';

type PrismaMock = typeof prisma;

const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

describe('recurring occurrence sweep — materialisation (regression, bug 2 + recurring bills)', () => {
  beforeEach(() => resetPrismaMocks(prisma));

  it('materialises every missing daily income cycle up to today, never the genesis date, never an existing occurrence', async () => {
    const genesis = addDaysUtc(startOfTodayUtc(), -3);
    const already = addDaysUtc(genesis, 2); // already materialised → must be skipped

    (prisma.income.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        {
          id: 'inc-1',
          date: genesis,
          frequency: Frequency.DAILY,
          familyId: 'f-1',
          memberId: 'm-1',
          type: IncomeType.SALARY,
          amount: 1000,
          description: 'Daily feed',
          notes: null,
        },
      ])
      .mockResolvedValueOnce([{ recurringSourceId: 'inc-1', date: already }]);
    (prisma.income.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });

    (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]).mockResolvedValue([]);
    (prisma.bill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]).mockResolvedValue([]);

    const total = await runRecurringOccurrences();

    expect(total).toBe(2);
    const written = (prisma.income.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0].data as {
      date: Date;
      isRecurring: boolean;
      frequency: Frequency | null;
      recurringSourceId: string;
    }[];

    expect(written.map((row) => isoDay(row.date)).sort()).toEqual(
      [genesis, already].map((d) => isoDay(addDaysUtc(d, 1))).sort(), // genesis+1 and already+1
    );
    expect(written.map((row) => isoDay(row.date))).not.toContain(isoDay(genesis));
    expect(written.map((row) => isoDay(row.date))).not.toContain(isoDay(already));
    for (const row of written) {
      expect(row.isRecurring).toBe(false);
      expect(row.frequency).toBeNull();
      expect(row.recurringSourceId).toBe('inc-1');
    }
  });

  it('generates forward recurring bill payables (isRecurring=false) while skipping the source dueDate and materialised cycles', async () => {
    const genesis = startOfTodayUtc();
    const materialized = addDaysUtc(genesis, 1); // today+1 already exists
    const expectedForward = addDaysUtc(genesis, 2); // today+2 must be created

    (prisma.income.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]).mockResolvedValue([]);
    (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]).mockResolvedValue([]);
    (prisma.bill.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        {
          id: 'bill-1',
          dueDate: genesis,
          frequency: Frequency.DAILY,
          familyId: 'f-1',
          type: 'ELECTRICITY',
          name: 'Electricity',
          providerName: 'BESCOM',
          amount: 1500,
          notes: null,
        },
      ])
      .mockResolvedValueOnce([{ recurringSourceId: 'bill-1', dueDate: materialized }]);
    (prisma.bill.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    await runRecurringOccurrences();

    const written = (prisma.bill.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0].data as {
      dueDate: Date;
      isRecurring: boolean;
      recurringSourceId: string;
    }[];

    expect(written.map((row) => isoDay(row.dueDate))).toContain(isoDay(expectedForward));
    expect(written.map((row) => isoDay(row.dueDate))).not.toContain(isoDay(genesis));
    expect(written.map((row) => isoDay(row.dueDate))).not.toContain(isoDay(materialized));
    for (const row of written) {
      expect(row.isRecurring).toBe(false);
      expect(row.recurringSourceId).toBe('bill-1');
      expect(prisma.bill.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    }
  });

  it('is idempotent: wholly materialised series produce no rows', async () => {
    const genesis = addDaysUtc(startOfTodayUtc(), -1);
    const materialized = addDaysUtc(genesis, 1); // today — the only outstanding cycle

    (prisma.income.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        {
          id: 'inc-1',
          date: genesis,
          frequency: Frequency.DAILY,
          familyId: 'f-1',
          memberId: 'm-1',
          type: IncomeType.SALARY,
          amount: 1000,
          description: null,
          notes: null,
        },
      ])
      .mockResolvedValueOnce([{ recurringSourceId: 'inc-1', date: materialized }]);

    (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]).mockResolvedValue([]);
    (prisma.bill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]).mockResolvedValue([]);

    const total = await runRecurringOccurrences();

    expect(total).toBe(0);
    expect(prisma.income.createMany).not.toHaveBeenCalled();
  });
});
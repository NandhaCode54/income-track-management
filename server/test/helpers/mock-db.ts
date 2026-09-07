import { vi } from 'vitest';

type MethodMock = ReturnType<typeof vi.fn>;
type ModelBag = Record<string, MethodMock>;

const createModelBag = (): ModelBag =>
  new Proxy({} as Record<string, MethodMock>, {
    get: (target, prop: string) => {
      if (!(prop in target)) target[prop] = vi.fn();
      return target[prop];
    },
  });

/**
 * A Prisma-client-shaped fake. Every model resolves to a bag of lazily-created
 * `vi.fn()` method slots, so tests can program a fixture like
 * `prisma.user.findUnique.mockResolvedValue(...)` and later assert the exact
 * query shape the real repository code sent.
 *
 * Test modules wire this into the app via:
 *
 *   vi.mock('../src/config/database', async () => {
 *     const { createPrismaMock } = await import('./helpers/mock-db');
 *     return { prisma: createPrismaMock() };
 *   });
 */
export const createPrismaMock = (): Record<string, unknown> => {
  const models = [
    'user',
    'family',
    'familyMember',
    'membership',
    'invite',
    'subscription',
    'income',
    'incomeCategory',
    'expense',
    'expenseCategory',
    'bill',
    'rent',
    'schoolFee',
    'chitFund',
    'chitPayment',
    'goal',
    'goalContribution',
    'budget',
    'notification',
    'auditLog',
    'refreshToken',
  ] as const;

  const prisma: Record<string, unknown> = { $transaction: vi.fn() };
  for (const model of models) prisma[model] = createModelBag();
  return prisma;
};

export type PrismaMock = ReturnType<typeof createPrismaMock>;

/** Restore every fixture a test set, so suites are independent. */
export const resetPrismaMocks = (prisma: PrismaMock): void => {
  for (const value of Object.values(prisma)) {
    if (typeof value === 'function') {
      (value as MethodMock).mockReset();
      continue;
    }
    if (value && typeof value === 'object') {
      for (const method of Object.values(value as ModelBag)) {
        if (typeof method.mockReset === 'function') method.mockReset();
      }
    }
  }
};
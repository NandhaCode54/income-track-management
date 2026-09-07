import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanType, SubscriptionStatus } from '@prisma/client';

vi.mock('../src/modules/subscription/subscription.service', () => ({
  subscriptionService: { getPlan: vi.fn() },
}));

import { requirePlan } from '../src/middlewares/plan.middleware';
import { subscriptionService } from '../src/modules/subscription/subscription.service';
import { PaymentRequiredError } from '../src/shared/errors/PaymentRequiredError';

type Fn = ReturnType<typeof vi.fn>;

const makeReq = (familyId = 'f-1') =>
  ({
    user: { id: 'u-1', email: 'a@b.c', firstName: 'A', lastName: 'B' },
    member: { id: 'm-1', familyId, role: 'FAMILY_HEAD' },
  }) as never;

const next = vi.fn();

const run = async (plan: PlanType | null, status: SubscriptionStatus, ...features: Parameters<typeof requirePlan>): Promise<void> => {
  next.mockReset();
  (subscriptionService.getPlan as unknown as Fn).mockResolvedValue(
    plan ? { plan, status } : null,
  );
  const middleware = requirePlan(...features);
  await middleware(makeReq(), {} as never, next);
};

describe('requirePlan — paid-feature entitlement gate', () => {
  beforeEach(() => {
    (subscriptionService.getPlan as unknown as Fn).mockReset();
    next.mockReset();
  });

  it('lets an entitled ACTIVE subscription through', async () => {
    await run(PlanType.PRO, SubscriptionStatus.ACTIVE, 'AI_INSIGHTS');
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  it('lets a FAMILY subscription through its exclusive features', async () => {
    await run(PlanType.FAMILY, SubscriptionStatus.ACTIVE, 'ASSETS_LIABILITIES', 'CHIT_FUNDS');
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  it('blocks a FREE plan with 402/UPGRADE_REQUIRED — UI copy is not the gate', async () => {
    await run(PlanType.FREE, SubscriptionStatus.ACTIVE, 'AI_INSIGHTS');
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(PaymentRequiredError);
    expect(error.statusCode).toBe(402);
    expect(error.code).toBe('UPGRADE_REQUIRED');
  });

  it('blocks a PRO plan asking for a FAMILY-only feature', async () => {
    await run(PlanType.PRO, SubscriptionStatus.ACTIVE, 'ASSETS_LIABILITIES');
    expect(next.mock.calls[0][0]).toBeInstanceOf(PaymentRequiredError);
  });

  it('blocks a non-active paid subscription (CANCELLED)', async () => {
    await run(PlanType.PRO, SubscriptionStatus.CANCELLED, 'AI_INSIGHTS');
    expect(next.mock.calls[0][0]).toBeInstanceOf(PaymentRequiredError);
  });

  it('blocks an upgrade intent still PENDING_PAYMENT — entitlement starts after activation', async () => {
    await run(PlanType.FREE, SubscriptionStatus.PENDING_PAYMENT, 'AI_INSIGHTS');
    expect(next.mock.calls[0][0]).toBeInstanceOf(PaymentRequiredError);
  });

  it('blocks a family with no subscription row at all', async () => {
    await run(null, SubscriptionStatus.ACTIVE, 'AI_INSIGHTS');
    expect(next.mock.calls[0][0]).toBeInstanceOf(PaymentRequiredError);
  });
});
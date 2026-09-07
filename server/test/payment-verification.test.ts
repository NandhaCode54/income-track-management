import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlanType, SubscriptionStatus } from '@prisma/client';

vi.mock('../src/config/database', async () => {
  const { createPrismaMock } = await import('./helpers/mock-db');
  return { prisma: createPrismaMock() };
});

vi.mock('../src/shared/utils/api-response.util', () => ({
  sendSuccess: vi.fn(),
}));

import { prisma } from '../src/config/database';
import { resetPrismaMocks } from './helpers/mock-db';
import { env } from '../src/config/env';
import { signWebhookPayload, verifyWebhookSignature } from '../src/shared/utils/webhook.util';
import { subscriptionService } from '../src/modules/subscription/subscription.service';
import { subscriptionController } from '../src/modules/subscription/subscription.controller';
import { sendSuccess } from '../src/shared/utils/api-response.util';
import { ValidationError } from '../src/shared/errors/ValidationError';

type Fn = ReturnType<typeof vi.fn>;

/** A `SubscriptionRow`-shaped fixture with select-fields the service reads. */
const baseRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub-1',
  familyId: 'f-1',
  plan: PlanType.FREE,
  status: SubscriptionStatus.ACTIVE,
  startDate: new Date('2026-01-01'),
  renewalDate: null,
  cancelledAt: null,
  trialEndsAt: null,
  paymentMethod: null,
  pendingPlan: null,
  pendingBillingCycle: null,
  pendingAmount: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  externalId: null,
  ...overrides,
});

describe('webhook signature util', () => {
  it('accepts a payload signed with the shared secret, rejects anything else', () => {
    const payload = JSON.stringify({ event: 'subscription.paid', data: { familyId: 'f-1' } });
    const good = signWebhookPayload(payload, 'secret-a');
    expect(verifyWebhookSignature(payload, good, 'secret-a')).toBe(true);

    expect(verifyWebhookSignature(payload, good, 'secret-b')).toBe(false);
    expect(verifyWebhookSignature(payload, 'bogus', 'secret-a')).toBe(false);
    expect(verifyWebhookSignature(payload, undefined, 'secret-a')).toBe(false);
  });
});

describe('upgrade records an intent, payment activation is the only door', () => {
  beforeEach(() => resetPrismaMocks(prisma));

  it('POST /upgrade never activates — it writes a PENDING_PAYMENT intent with a server priced amount', async () => {
    (prisma.subscription.findUnique as unknown as Fn).mockResolvedValue(baseRow());
    (prisma.familyMember.count as unknown as Fn).mockResolvedValue(1);
    (prisma.subscription.update as unknown as Fn).mockResolvedValue(
      baseRow({
        status: SubscriptionStatus.PENDING_PAYMENT,
        pendingPlan: PlanType.PRO,
        pendingBillingCycle: 'monthly',
        pendingAmount: 299,
      }),
    );

    const result = await subscriptionService.upgrade('f-1', {
      plan: PlanType.PRO,
      billingCycle: 'monthly',
    });

    expect(result.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
    expect(result.plan).toBe(PlanType.FREE);
    expect(result.pendingPlan).toBe(PlanType.PRO);
    expect(result.pendingBillingCycle).toBe('monthly');
    expect(result.pendingAmount).toBe(299);

    const updateData = (prisma.subscription.update as unknown as Fn).mock.calls[0][0].data;
    // Activation fields must NOT be written by the intent call.
    expect(updateData.plan).toBeUndefined();
    expect(updateData.renewalDate).toBeUndefined();
  });

  it('activation rejects a payment that no pending intent matches', async () => {
    // An ACTIVE PRO subscription (already paid, nothing pending) gets a stray webhook.
    (prisma.subscription.findUnique as unknown as Fn).mockResolvedValue(
      baseRow({ plan: PlanType.PRO, status: SubscriptionStatus.ACTIVE }),
    );

    await expect(
      subscriptionService.activateVerifiedPayment('f-1', PlanType.FAMILY, 'monthly', 'ref-x'),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('activation applies exactly the pending intent and clears it', async () => {
    (prisma.subscription.findUnique as unknown as Fn).mockResolvedValue(
      baseRow({
        status: SubscriptionStatus.PENDING_PAYMENT,
        pendingPlan: PlanType.PRO,
        pendingBillingCycle: 'yearly',
        pendingAmount: 2499,
      }),
    );
    (prisma.subscription.update as unknown as Fn).mockResolvedValue(
      baseRow({
        plan: PlanType.PRO,
        status: SubscriptionStatus.ACTIVE,
        renewalDate: new Date('2027-01-01'),
        externalId: 'pay_123',
        pendingPlan: null,
        pendingBillingCycle: null,
        pendingAmount: null,
      }),
    );

    const result = await subscriptionService.activateVerifiedPayment(
      'f-1',
      PlanType.PRO,
      'yearly',
      'pay_123',
    );

    expect(result.plan).toBe(PlanType.PRO);
    expect(result.status).toBe(SubscriptionStatus.ACTIVE);
    expect(result.pendingPlan).toBeNull();
    expect(result.pendingAmount).toBeNull();

    const updateData = (prisma.subscription.update as unknown as Fn).mock.calls[0][0].data;
    expect(updateData.externalId).toBe('pay_123');
  });

  it('demo provider completes a pending upgrade through the same activation path', async () => {
    (prisma.subscription.findUnique as unknown as Fn).mockResolvedValue(
      baseRow({
        status: SubscriptionStatus.PENDING_PAYMENT,
        pendingPlan: PlanType.FAMILY,
        pendingBillingCycle: 'monthly',
        pendingAmount: 599,
      }),
    );
    (prisma.subscription.update as unknown as Fn).mockResolvedValue(
      baseRow({
        plan: PlanType.FAMILY,
        status: SubscriptionStatus.ACTIVE,
        externalId: 'demo_1',
        pendingPlan: null,
        pendingBillingCycle: null,
        pendingAmount: null,
      }),
    );

    const result = await subscriptionService.completeDemoPayment('f-1', 'demo_1');

    expect(result.plan).toBe(PlanType.FAMILY);
    expect(result.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('demo provider refuses when nothing is pending', async () => {
    (prisma.subscription.findUnique as unknown as Fn).mockResolvedValue(baseRow());

    await expect(subscriptionService.completeDemoPayment('f-1', 'demo_1')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe('payment provider webhook route', () => {
  beforeEach(() => {
    resetPrismaMocks(prisma);
    (sendSuccess as unknown as Fn).mockReset();
  });

  afterEach(() => {
    delete (env as { PAYMENT_WEBHOOK_SECRET?: string }).PAYMENT_WEBHOOK_SECRET;
  });

  const callWebhook = async (
    body: Buffer,
    signature?: string,
  ): Promise<{ response?: unknown; error?: unknown }> => {
    const res = { statusCode: 0, json: vi.fn() };
    const req = {
      body,
      get: (header: string) => {
        if (header.toLowerCase() === 'x-webhook-signature') return signature;
        return undefined;
      },
    };
    let captured: { response?: unknown; error?: unknown } = {};
    await subscriptionController.webhook(
      req as never,
      res as never,
      ((err?: unknown) => {
        if (err) captured.error = err;
      }) as never,
    );
    // The success path never calls `next` — read what the handler sent instead.
    const lastCall = (sendSuccess as unknown as Fn).mock.calls.at(-1);
    if (lastCall) captured.response = lastCall[2];
    return captured;
  };

  it('fails closed when no webhook secret is configured', async () => {
    delete (env as { PAYMENT_WEBHOOK_SECRET?: string }).PAYMENT_WEBHOOK_SECRET;
    const body = Buffer.from('{}');
    const { error } = await callWebhook(body, 'whatever');

    const appError = error as { statusCode: number; code: string };
    expect(appError).toBeDefined();
    expect(appError.statusCode).toBe(503);
    expect(appError.code).toBe('WEBHOOK_NOT_CONFIGURED');
    expect(sendSuccess).not.toHaveBeenCalled();
  });

  it('rejects a forged body with a bad signature (401)', async () => {
    (env as { PAYMENT_WEBHOOK_SECRET?: string }).PAYMENT_WEBHOOK_SECRET = 'top-secret';
    const { error } = await callWebhook(Buffer.from('{"event":"subscription.paid"}'), 'sha256=h4x');

    const appError = error as { statusCode: number; code: string };
    expect(appError.statusCode).toBe(401);
    expect(appError.code).toBe('INVALID_SIGNATURE');
  });

  it('activates a subscription.paid event whose signature verifies', async () => {
    (env as { PAYMENT_WEBHOOK_SECRET?: string }).PAYMENT_WEBHOOK_SECRET = 'top-secret';
    const payload = JSON.stringify({
      event: 'subscription.paid',
      data: { familyId: 'f-1', plan: 'PRO', billingCycle: 'monthly', reference: 'pay_9' },
    });
    const signature = signWebhookPayload(payload, 'top-secret');

    (prisma.subscription.findUnique as unknown as Fn).mockResolvedValue(
      baseRow({
        status: SubscriptionStatus.PENDING_PAYMENT,
        pendingPlan: PlanType.PRO,
        pendingBillingCycle: 'monthly',
        pendingAmount: 299,
      }),
    );
    (prisma.subscription.update as unknown as Fn).mockResolvedValue(
      baseRow({
        plan: PlanType.PRO,
        status: SubscriptionStatus.ACTIVE,
        externalId: 'pay_9',
        pendingPlan: null,
        pendingBillingCycle: null,
        pendingAmount: null,
      }),
    );

    const { response } = await callWebhook(Buffer.from(payload), signature);

    expect(response).toBeDefined();
    expect(response).toMatchObject({
      subscription: { plan: PlanType.PRO, status: SubscriptionStatus.ACTIVE },
    });
  });

  it('acknowledges unrelated provider events without touching the plan', async () => {
    (env as { PAYMENT_WEBHOOK_SECRET?: string }).PAYMENT_WEBHOOK_SECRET = 'top-secret';
    const payload = JSON.stringify({ event: 'charge.updated', data: {} });
    const signature = signWebhookPayload(payload, 'top-secret');

    const { response } = await callWebhook(Buffer.from(payload), signature);

    expect(response).toEqual({});
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it('rejects a webhook missing required payment fields (422)', async () => {
    (env as { PAYMENT_WEBHOOK_SECRET?: string }).PAYMENT_WEBHOOK_SECRET = 'top-secret';
    const payload = JSON.stringify({
      event: 'subscription.paid',
      data: { familyId: 'f-1' }, // no plan / billingCycle / reference
    });
    const signature = signWebhookPayload(payload, 'top-secret');

    const { error } = await callWebhook(Buffer.from(payload), signature);

    const appError = error as { statusCode: number; code: string };
    expect(appError.statusCode).toBe(422);
    expect(appError.code).toBe('INVALID_WEBHOOK_PAYLOAD');
  });
});
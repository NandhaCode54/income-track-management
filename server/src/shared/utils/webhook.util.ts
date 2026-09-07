import crypto from 'crypto';

/**
 * HMAC-SHA256 signature for payment-provider webhooks.
 *
 * The provider signs the raw request body with the shared `PAYMENT_WEBHOOK_SECRET`
 * and sends it in the `x-webhook-signature` header as `sha256=<hex>`. The server
 * recomputes and compares with a constant-time equality so a valid signature can
 * neither be forged without the secret nor leak through a timing side channel.
 */
export const signWebhookPayload = (payload: string, secret: string): string =>
  `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;

export const verifyWebhookSignature = (
  payload: string,
  signature: string | undefined,
  secret: string,
): boolean => {
  if (!signature) return false;
  const expected = signWebhookPayload(payload, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
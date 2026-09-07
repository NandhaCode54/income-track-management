import { prisma } from '../../config/database';
import type { Prisma } from '@prisma/client';
import type { NotificationRow } from './notification.types';
import { sendEmail } from '../../shared/utils/email.util';
import { logger } from '../../shared/utils/logger';

/**
 * The single door every reminder walks through. Jobs decide *what* to say;
 * this decides *how it lands*: one bulk insert for the in-app feed, then a
 * per-user email digest so three bills due the same week are one email, not
 * three.
 *
 * `emailFamilies` (when given) restricts who gets an email to those family ids,
 * which is what gates "email reminders" behind the paid plan — in-app rows are
 * still written for everyone, only the SMTP leg is entitlement-checked.
 *
 * Email failures are logged, never thrown — an SMTP hiccup must not fail a
 * cron tick whose notifications were already persisted.
 */
export const dispatchNotifications = async (
  rows: NotificationRow[],
  options: { email?: boolean; emailFamilies?: Set<string> } = {},
): Promise<number> => {
  if (rows.length === 0) return 0;

  await prisma.notification.createMany({
    data: rows.map((row) => ({
      familyId: row.familyId,
      userId: row.userId,
      type: row.type,
      title: row.title,
      message: row.message,
      ...(row.metadata
        ? { metadata: row.metadata as unknown as Prisma.InputJsonValue }
        : {}),
    })),
  });

  if (options.email) {
    const emailRows = options.emailFamilies
      ? rows.filter((row) => options.emailFamilies?.has(row.familyId))
      : rows;
    if (emailRows.length > 0) await sendDigests(emailRows);
  }

  return rows.length;
};

const sendDigests = async (rows: NotificationRow[]): Promise<void> => {
  const byUser = new Map<string, NotificationRow[]>();
  for (const row of rows) {
    const existing = byUser.get(row.userId) ?? [];
    existing.push(row);
    byUser.set(row.userId, existing);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...byUser.keys()] } },
    select: { id: true, email: true, firstName: true },
  });

  await Promise.allSettled(
    users.map(async (user) => {
      const items = byUser.get(user.id) ?? [];
      try {
        await sendEmail({
          to: user.email,
          subject:
            items.length === 1
              ? `Reminder: ${items[0].title}`
              : `Family Finance Manager — ${items.length} reminders`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2>Hi ${user.firstName},</h2>
              <p>Here ${items.length === 1 ? 'is a payment reminder' : `are ${items.length} payment reminders`} from your family workspace:</p>
              <ul>
                ${items
                  .map(
                    (item) =>
                      `<li style="margin-bottom:8px"><strong>${item.title}</strong><br/><span style="color:#6b7280">${item.message}</span></li>`,
                  )
                  .join('')}
              </ul>
              <p style="color:#6b7280;font-size:14px">Open Family Finance Manager to record these payments.</p>
            </div>
          `,
        });
      } catch (error) {
        logger.error('Reminder digest email failed', { userId: user.id, error });
      }
    }),
  );
};

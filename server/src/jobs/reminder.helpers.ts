import { NotificationType } from '@prisma/client';
import { prisma } from '../config/database';

/**
 * Helpers shared by the cron sweeps. They exist because every reminder job
 * needs the same three things: a "have we already said this?" check that does
 * not read the whole notifications table, a map of who is active in each
 * family, and the same phrasing of "due in N days".
 */

/**
 * One notification per entity, ever — keyed on an id carried inside the
 * notification's metadata JSON.
 *
 * Asked as "which of *these* entities have been notified", not "give me every
 * notification of this type". The second reads the whole table, and since
 * nothing ever deletes a notification it gets slower every day the app is
 * alive — a daily job that degrades with age is a nasty thing to leave behind.
 */
export const alreadyNotified = async (
  types: NotificationType[],
  metaKey: string,
  entityIds: string[],
): Promise<Set<string>> => {
  if (entityIds.length === 0) return new Set();

  const existing = await prisma.notification.findMany({
    where: {
      type: { in: types },
      OR: entityIds.map((id) => ({ metadata: { path: [metaKey], equals: id } })),
    },
    select: { metadata: true },
  });

  const notified = new Set<string>();
  for (const row of existing) {
    const id = (row.metadata as Record<string, unknown> | null)?.[metaKey];
    if (typeof id === 'string') notified.add(id);
  }

  return notified;
};

/** Everyone active in the family — household obligations belong to everyone. */
export const activeMemberUserIds = async (
  familyIds: string[],
): Promise<Map<string, string[]>> => {
  if (familyIds.length === 0) return new Map();

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

export const describeWhen = (today: Date, dueDate: Date): { days: number; phrase: string } => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const startOf = (d: Date): Date =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const days = Math.round((startOf(dueDate).getTime() - startOf(today).getTime()) / MS_PER_DAY);
  const phrase =
    days === 0 ? 'today' : days < 0 ? `${Math.abs(days)} day(s) ago` : `in ${days} day(s)`;
  return { days, phrase };
};

import { PrismaClient, UserRole, PlanType, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DEFAULT_EXPENSE_CATEGORIES } from '../src/shared/constants/categories';

const prisma = new PrismaClient();

/**
 * A seed is a *write to data* — refusing to run against production by default
 * is the whole guard here. An operator who genuinely wants a throwaway admin in
 * a staging prod-like environment can opt in explicitly with
 * `SEED_ALLOWED_PRODUCTION=true`, but the script will never do it because it was
 * invoked accidentally.
 */
const assertAllowed = (): void => {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOWED_PRODUCTION !== 'true') {
    throw new Error(
      'Refusing to seed in production. Set SEED_ALLOWED_PRODUCTION=true only if this is a throwaway environment.',
    );
  }
};

async function main() {
  assertAllowed();
  console.log('🌱 Seeding database...');

  // Super admin — credentials come from the environment, never a checked-in
  // password. If none is supplied we generate one and print it once; dev seeds
  // are supposed to be throwaway.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@familyfinance.app';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? crypto.randomBytes(12).toString('hex');
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      // Uphold an env-supplied password on re-seeds too; a fresh random one also
      // lands so a regenerated throwaway account stays usable.
      passwordHash: adminHash,
    },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      firstName: 'Super',
      lastName: 'Admin',
      isVerified: true,
      isActive: true,
    },
  });

  // Demo tenant + family
  const tenant = await prisma.tenant.create({
    data: { name: 'Demo Tenant', plan: PlanType.PRO },
  });

  const family = await prisma.family.create({
    data: {
      tenantId: tenant.id,
      name: 'Demo Family',
      code: 'DEMO0001',
    },
  });

  await prisma.familyMember.create({
    data: {
      familyId: family.id,
      userId: admin.id,
      role: UserRole.SUPER_ADMIN,
    },
  });

  await prisma.subscription.create({
    data: {
      familyId: family.id,
      plan: PlanType.PRO,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  await prisma.familySettings.create({
    data: { familyId: family.id },
  });

  // Default expense categories — the same starter set registration creates.
  await prisma.expenseCategory.createMany({
    data: DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
      familyId: family.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isDefault: true,
    })),
  });

  console.log('✅ Seed complete');
  console.log(`   Admin email: ${adminEmail}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    // The password is only logged when the environment did not supply one —
    // never echo an operator-chosen credential back to the console.
    console.log(`   Generated admin password: ${adminPassword}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

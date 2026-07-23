import { PrismaClient, UserRole, PlanType, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_EXPENSE_CATEGORIES } from '../src/shared/constants/categories';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Super admin
  const adminHash = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@familyfinance.app' },
    update: {},
    create: {
      email: 'admin@familyfinance.app',
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
  console.log('   Admin email: admin@familyfinance.app');
  console.log('   Admin password: Admin@123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

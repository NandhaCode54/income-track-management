import { PrismaClient, UserRole, PlanType, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

  // Default expense categories
  const categories = [
    { name: 'Food & Dining', icon: '🍽️', color: '#f97316' },
    { name: 'Transportation', icon: '🚗', color: '#3b82f6' },
    { name: 'Shopping', icon: '🛍️', color: '#8b5cf6' },
    { name: 'Entertainment', icon: '🎬', color: '#ec4899' },
    { name: 'Health & Medical', icon: '🏥', color: '#22c55e' },
    { name: 'Education', icon: '📚', color: '#f59e0b' },
    { name: 'Utilities', icon: '💡', color: '#6366f1' },
    { name: 'Personal Care', icon: '💆', color: '#14b8a6' },
    { name: 'Household', icon: '🏠', color: '#84cc16' },
    { name: 'Miscellaneous', icon: '📦', color: '#94a3b8' },
  ];

  for (const cat of categories) {
    await prisma.expenseCategory.create({
      data: { familyId: family.id, ...cat, isDefault: true },
    });
  }

  console.log('✅ Seed complete');
  console.log('   Admin email: admin@familyfinance.app');
  console.log('   Admin password: Admin@123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

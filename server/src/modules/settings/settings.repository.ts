import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

const settingsSelect = {
  id: true,
  currency: true,
  currencySymbol: true,
  timezone: true,
  language: true,
  dateFormat: true,
  financialYearStart: true,
  emailReminders: true,
  pushReminders: true,
  reminderDaysBefore: true,
  updatedAt: true,
} satisfies Prisma.FamilySettingsSelect;

export const settingsRepository = {
  find(familyId: string) {
    return prisma.familySettings.findUnique({
      where: { familyId },
      select: settingsSelect,
    });
  },

  update(familyId: string, data: Prisma.FamilySettingsUpdateInput) {
    return prisma.familySettings.update({
      where: { familyId },
      data,
      select: settingsSelect,
    });
  },
};

import {
  Banknote,
  Briefcase,
  Building2,
  Gift,
  Laptop,
  MoreHorizontal,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { Frequency, IncomeType } from '@/types/income.types';

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  SALARY: 'Salary',
  BUSINESS: 'Business',
  RENTAL: 'Rental',
  FREELANCE: 'Freelance',
  BONUS: 'Bonus',
  INVESTMENT: 'Investment',
  OTHER: 'Other',
};

export const INCOME_TYPE_ICONS: Record<IncomeType, LucideIcon> = {
  SALARY: Banknote,
  BUSINESS: Briefcase,
  RENTAL: Building2,
  FREELANCE: Laptop,
  BONUS: Gift,
  INVESTMENT: TrendingUp,
  OTHER: MoreHorizontal,
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  ONCE: 'One-off',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

export const SORT_LABELS: Record<string, string> = {
  'date:desc': 'Newest first',
  'date:asc': 'Oldest first',
  'amount:desc': 'Highest amount',
  'amount:asc': 'Lowest amount',
  'createdAt:desc': 'Recently added',
};

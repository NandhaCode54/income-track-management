import type { BudgetStatus } from '@/types/budget.types';

export const STATUS_LABELS: Record<BudgetStatus, string> = {
  ON_TRACK: 'On track',
  WARNING: 'Close to limit',
  OVER: 'Over budget',
};

/**
 * Status is never carried by colour alone — every line also states its
 * percentage and shows the label above, so the meaning survives a greyscale
 * print or a red-green colour deficiency.
 */
export const STATUS_STYLES: Record<BudgetStatus, { bar: string; text: string; badge: string }> = {
  ON_TRACK: {
    bar: 'bg-emerald-500 dark:bg-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'success',
  },
  WARNING: {
    bar: 'bg-amber-500 dark:bg-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'warning',
  },
  OVER: {
    bar: 'bg-rose-500 dark:bg-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    badge: 'destructive',
  },
};

export const NEUTRAL_CATEGORY_COLOR = '#94a3b8';

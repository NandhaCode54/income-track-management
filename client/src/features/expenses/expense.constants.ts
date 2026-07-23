import type { PaymentMethod } from '@/types/expense.types';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  NET_BANKING: 'Net banking',
  BANK_TRANSFER: 'Bank transfer',
  WALLET: 'Wallet',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};

export const SORT_LABELS: Record<string, string> = {
  'date:desc': 'Newest first',
  'date:asc': 'Oldest first',
  'amount:desc': 'Highest amount',
  'amount:asc': 'Lowest amount',
  'createdAt:desc': 'Recently added',
};

/**
 * Swatches offered when creating a category. Categories are identified by name
 * first — the colour is decoration, so this only needs to be a set of hues that
 * stay legible on both themes.
 */
export const CATEGORY_COLORS = [
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#6366f1',
  '#3b82f6',
  '#06b6d4',
  '#14b8a6',
  '#22c55e',
  '#84cc16',
  '#f59e0b',
  '#94a3b8',
] as const;

/** Fallback swatch for a category saved without a colour. */
export const NEUTRAL_CATEGORY_COLOR = '#94a3b8';

export const CSV_TEMPLATE_COLUMNS = [
  'Date',
  'Description',
  'Category',
  'Amount',
  'Payment Method',
  'Tags',
  'Notes',
] as const;

/** A file the user can download, fill in and import — the format by example. */
export const CSV_TEMPLATE = [
  CSV_TEMPLATE_COLUMNS.join(','),
  '2026-07-01,Weekly groceries,Food & Dining,2450.00,UPI,groceries; weekly,Big Bazaar',
  '2026-07-03,Petrol,Transportation,1200,Card,,Full tank',
].join('\r\n');

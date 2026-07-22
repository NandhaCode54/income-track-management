import { useCallback } from 'react';
import { useFamily } from '@/features/family/family.hooks';
import { formatCompactCurrency, formatCurrency } from '@/utils/formatCurrency';

/**
 * Money formatters bound to the active family's configured currency.
 * Falls back to INR until the family settings query resolves.
 */
export const useCurrency = () => {
  const { data: family } = useFamily();
  const currency = family?.settings?.currency ?? 'INR';
  const symbol = family?.settings?.currencySymbol ?? '₹';

  return {
    currency,
    symbol,
    format: useCallback((value: number) => formatCurrency(value, currency), [currency]),
    formatCompact: useCallback(
      (value: number) => formatCompactCurrency(value, currency),
      [currency],
    ),
  };
};

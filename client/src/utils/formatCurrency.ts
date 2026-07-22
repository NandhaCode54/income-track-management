/**
 * Currency formatting. The family's currency code comes from its settings —
 * see `useCurrency`, which is what components should reach for.
 */
export const formatCurrency = (value: number, currency = 'INR'): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // An unknown ISO code would otherwise throw and blank the whole page.
    return `${currency} ${value.toFixed(2)}`;
  }
};

/** Short form for tight spaces: ₹1.2L / ₹12.5K. Falls back to the full format below 1,000. */
export const formatCompactCurrency = (value: number, currency = 'INR'): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatCurrency(value, currency);
  }
};

/** Signed percentage, e.g. "+12.4%" — used for period-over-period deltas. */
export const formatPercent = (value: number): string =>
  `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

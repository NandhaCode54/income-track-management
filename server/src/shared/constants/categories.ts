/**
 * The starter set of expense categories every new family workspace receives.
 *
 * It lives here rather than inside the seed script so that registration, the
 * seed and the self-healing "family has no categories yet" path all create the
 * *same* list — three copies of it would drift apart within a phase or two.
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
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
] as const;

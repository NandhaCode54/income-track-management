export const startOfMonth = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

export const startOfYear = (year: number = new Date().getFullYear()): Date => {
  return new Date(year, 0, 1);
};

export const endOfYear = (year: number = new Date().getFullYear()): Date => {
  return new Date(year, 11, 31, 23, 59, 59, 999);
};

/**
 * The window covering one calendar month, or a whole year when `month` is
 * omitted. Used by every summary and by budget-vs-actual.
 *
 * Built in **UTC**, because that is how dates are stored: the API receives
 * `yyyy-MM-dd` and `z.coerce.date()` turns it into UTC midnight. Local-time
 * boundaries would file a 1 July expense under June on any server west of
 * Greenwich — and the month a budget is measured over has to be exact.
 */
export const periodRange = (period: { year: number; month?: number }): { from: Date; to: Date } => {
  const from = period.month
    ? new Date(Date.UTC(period.year, period.month - 1, 1))
    : new Date(Date.UTC(period.year, 0, 1));

  // Day 0 of the next month is the last day of this one, leap years included.
  const to = period.month
    ? new Date(Date.UTC(period.year, period.month, 0, 23, 59, 59, 999))
    : new Date(Date.UTC(period.year, 11, 31, 23, 59, 59, 999));

  return { from, to };
};

/** The calendar month a stored date falls in, read in UTC to match `periodRange`. */
export const monthOf = (date: Date): { month: number; year: number } => ({
  month: date.getUTCMonth() + 1,
  year: date.getUTCFullYear(),
});

export const addHours = (date: Date, hours: number): Date => {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
};

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60 * 1000);
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isExpired = (date: Date): boolean => date < new Date();

export const formatDate = (date: Date): string => date.toISOString().split('T')[0];

/** Parse a short duration string (e.g. "15m", "7d", "30s", "12h") into milliseconds. */
export const parseDurationMs = (value: string): number => {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
};

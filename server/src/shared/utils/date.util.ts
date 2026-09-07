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

/**
 * Today at UTC midnight.
 *
 * Dates are stored at UTC midnight and `periodRange` builds its windows in UTC,
 * so "today" has to be read the same way. Reading it locally puts a due date
 * stamped `2026-08-01T00:00Z` on the wrong side of the overdue line for anyone
 * west of Greenwich — the same class of bug as the local-time `periodRange`.
 */
export const startOfTodayUtc = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const addDaysUtc = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MS_PER_DAY);

export const endOfDayUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

/** `date` clipped to UTC midnight. Stored dates are already UTC midnights. */
export const startOfDayUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/** Whole days from `from` to `to`; negative when `to` is in the past. */
export const wholeDaysBetween = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);

/**
 * A recurring monthly due date, clamped to the length of the month.
 *
 * A loan debited on the 31st falls on the 30th in November and the 28th in
 * February — never on the 1st of the next month, which is what an unclamped
 * `Date.UTC(y, m - 1, 31)` silently produces. `Date.UTC(year, month, 0)` is day
 * zero of the *next* month, i.e. the last day of this one, leap years included.
 *
 * Shared by the EMI schedule generator and the dashboard's projected instalments
 * so a due date means one thing.
 */
export const dueDateInMonth = (year: number, month: number, dueDay: number): Date => {
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(dueDay, lastDayOfMonth)));
};

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

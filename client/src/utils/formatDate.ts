import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

const toDate = (value: string | Date): Date | null => {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? date : null;
};

/** "12 Mar 2026" — the default for dates shown in tables and cards. */
export const formatDate = (value: string | Date): string => {
  const date = toDate(value);
  return date ? format(date, 'd MMM yyyy') : '—';
};

/** "12 Mar 2026, 4:30 pm" */
export const formatDateTime = (value: string | Date): string => {
  const date = toDate(value);
  return date ? format(date, "d MMM yyyy, h:mm aaa") : '—';
};

/** `yyyy-MM-dd` — the format `<input type="date">` requires. */
export const toDateInputValue = (value: string | Date): string => {
  const date = toDate(value);
  return date ? format(date, 'yyyy-MM-dd') : '';
};

/** "in 3 days" / "2 months ago" */
export const formatRelative = (value: string | Date): string => {
  const date = toDate(value);
  return date ? formatDistanceToNowStrict(date, { addSuffix: true }) : '—';
};

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

import { Frequency } from '@prisma/client';
import { addDays } from './date.util';

const DAY_MS = 24 * 60 * 60 * 1000;

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  // Clamp to the last valid day so 31 Jan + 1 month lands on 28/29 Feb, not 2/3 Mar.
  result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
  return result;
};

/** How many periods of `frequency` fit in one step. `null` means "never repeats". */
const stride = (frequency: Frequency): { unit: 'days' | 'months'; size: number } | null => {
  switch (frequency) {
    case Frequency.DAILY:
      return { unit: 'days', size: 1 };
    case Frequency.WEEKLY:
      return { unit: 'days', size: 7 };
    case Frequency.MONTHLY:
      return { unit: 'months', size: 1 };
    case Frequency.QUARTERLY:
      return { unit: 'months', size: 3 };
    case Frequency.YEARLY:
      return { unit: 'months', size: 12 };
    case Frequency.ONCE:
    default:
      return null;
  }
};

/** One step forward for a recurring entry. `ONCE` never repeats. */
export const advance = (date: Date, frequency: Frequency): Date | null => {
  const step = stride(frequency);
  if (!step) return null;
  return step.unit === 'days' ? addDays(date, step.size) : addMonths(date, step.size);
};

/**
 * The `index`-th occurrence of a series, measured from its **anchor** date —
 * never from the previous occurrence. Stepping from the previous date is how
 * month-end dates drift: 31 Jan advances to 28 Feb, and the next step from
 * 28 Feb lands on 28 Mar instead of 31 Mar. Re-anchoring every time keeps the
 * series landing on the anchor's day-of-month (clamped to the last valid day).
 * `ONCE` never repeats and returns `null`.
 */
export const occurrenceAt = (start: Date, frequency: Frequency, index: number): Date | null => {
  const step = stride(frequency);
  if (!step || index < 0) return null;
  return step.unit === 'days' ? addDays(start, step.size * index) : addMonths(start, step.size * index);
};

/**
 * The first occurrence strictly after `from` for a series that started on `start`.
 * Purely derived — recurring entries are not materialised into rows until the
 * scheduler lands (Phase 12), so this is what the UI shows as "next payment".
 *
 * The step count is computed rather than looped, so a daily series started years
 * ago costs the same as a monthly one started last week.
 */
export const nextOccurrence = (
  start: Date,
  frequency: Frequency,
  from: Date = new Date(),
): Date | null => {
  const step = stride(frequency);
  if (!step) return null;
  if (start > from) return new Date(start);

  const elapsed =
    step.unit === 'days'
      ? Math.floor((from.getTime() - start.getTime()) / DAY_MS)
      : (from.getFullYear() - start.getFullYear()) * 12 + (from.getMonth() - start.getMonth());

  // Every candidate is measured from `start`, never from the previous one: stepping
  // month by month would clamp a 31st down to the 30th and never recover it.
  const first = Math.max(0, Math.floor(elapsed / step.size) - 2);

  for (let k = first; k < first + 16; k += 1) {
    const offset = k * step.size;
    const candidate = step.unit === 'days' ? addDays(start, offset) : addMonths(start, offset);
    if (candidate > from) return candidate;
  }

  return null;
};

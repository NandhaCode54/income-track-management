import { startOfTodayUtc } from '../shared/utils/date.util';
import { logger } from '../shared/utils/logger';
import { checkAllBudgets } from '../modules/budget/budget.alert';

/**
 * The daily budget sweep. For the current month it compares every budget line
 * — per-category, parent (rolling up its children) and the overall line —
 * against actual spend and raises:
 *
 * - `BUDGET_WARNING`  at >=85% of the limit,
 * - `BUDGET_EXCEEDED` past the limit.
 *
 * All of the logic lives in `budget.alert.checkAllBudgets`, the same module
 * that powers the request-time (expense-write) trigger. Sharing one code path
 * guarantees the two triggers agree on what counts towards a parent budget and
 * on the dedupe key: one alert per budget per kind, ever, keyed on the budget
 * id — so a threshold crossing cannot be reported twice just because it was
 * reached interactively and again in the daily sweep.
 */

export const runBudgetAlerts = async (): Promise<number> => {
  const now = startOfTodayUtc();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();

  const evaluated = await checkAllBudgets(month, year);
  logger.info(`Budget sweep: ${evaluated} budget line(s) evaluated`);
  return evaluated;
};

/** Fire-and-forget wrapper: a failed sweep must never take the process down. */
export const budgetAlertTask = (): void => {
  void runBudgetAlerts().catch((error) => logger.error('Budget alert job failed', { error }));
};

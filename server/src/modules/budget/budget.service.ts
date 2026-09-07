import { Prisma, PlanType } from '@prisma/client';
import { budgetRepository, type BudgetRow } from './budget.repository';
import { expenseRepository } from '../expense/expense.repository';
import { subscriptionService } from '../subscription/subscription.service';
import { runBudgetCheck } from './budget.alert';
import {
  percentUsedOf,
  statusFor,
  type BudgetDto,
  type BudgetLineDto,
  type BudgetPeriodQuery,
  type BudgetVsActualDto,
  type CopyBudgetsInput,
  type CopyBudgetsResultDto,
  type CreateBudgetInput,
  type UnbudgetedLineDto,
  type UpdateBudgetInput,
} from './budget.types';
import type { ActorContext } from '../../shared/types/actor';
import { AppError } from '../../shared/errors/AppError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { MSG } from '../../shared/constants/messages';

/** Money crosses the wire as a plain number; two decimals always fit a JS float exactly. */
const toNumber = (value: Prisma.Decimal): number => Number(value.toFixed(2));

const round2 = (value: number): number => Math.round(value * 100) / 100;

const OVERALL_LABEL = 'Everything';
const UNCATEGORISED_LABEL = 'Uncategorised';

/**
 * The FREE tier's "Up to 5 budget categories". The overall family-wide budget
 * (`categoryId = null`) does not count toward it — the cap is about how many
 * categories a family can budget against in a single month.
 */
const FREE_CATEGORY_BUDGET_LIMIT = 5;

/**
 * Enforced server-side in `create` and `copy`, not by UI copy: a FREE family
 * upgrading mid-month must not have snuck a sixth category line in via the API,
 * and the cap is read from the live plan so it cannot be gamed by client claims.
 * `incomingNewCategories` is how many categories the upcoming write adds that
 * are not budgeted yet in the target period.
 */
const assertCategoryBudgetCap = async (
  familyId: string,
  month: number,
  year: number,
  incomingNewCategories: number,
): Promise<void> => {
  const plan = await subscriptionService.getPlan(familyId);
  if (!plan || plan.plan !== PlanType.FREE) return;

  const current = await budgetRepository.listForPeriod(familyId, month, year);
  const currentDistinct = new Set(
    current.map((row) => row.categoryId).filter((id): id is string => id !== null),
  ).size;

  if (currentDistinct + incomingNewCategories > FREE_CATEGORY_BUDGET_LIMIT) {
    throw new ValidationError(MSG.VALIDATION_ERROR, {
      categoryId: [
        `The FREE plan allows up to ${FREE_CATEGORY_BUDGET_LIMIT} budget categories per month.`,
      ],
    });
  }
};

const categoryLabel = (row: BudgetRow): string => {
  if (!row.category) return OVERALL_LABEL;
  return row.category.parent
    ? `${row.category.parent.name} › ${row.category.name}`
    : row.category.name;
};

const toDto = (row: BudgetRow): BudgetDto => ({
  id: row.id,
  amount: toNumber(row.amount),
  month: row.month,
  year: row.year,
  category: row.category
    ? {
        id: row.category.id,
        name: row.category.name,
        icon: row.category.icon,
        color: row.category.color,
        parentName: row.category.parent?.name ?? null,
      }
    : null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/** One row of "what was spent where" in the period, flattened for the rollup below. */
interface SpendRow {
  categoryId: string | null;
  parentId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
}

const loadSpending = async (
  familyId: string,
  from: Date,
  to: Date,
): Promise<{ rows: SpendRow[]; total: number }> => {
  const grouped = await expenseRepository.groupByCategory(familyId, from, to);

  const rows = grouped.map((row) => ({
    categoryId: row.categoryId,
    parentId: row.category?.parentId ?? null,
    name: row.category
      ? row.category.parent
        ? `${row.category.parent.name} › ${row.category.name}`
        : row.category.name
      : UNCATEGORISED_LABEL,
    icon: row.category?.icon ?? null,
    color: row.category?.color ?? null,
    total: toNumber(row._sum.amount ?? new Prisma.Decimal(0)),
  }));

  return { rows, total: round2(rows.reduce((sum, row) => sum + row.total, 0)) };
};

/**
 * What a budget line has consumed. A budget on a parent category absorbs
 * everything filed under its children too — otherwise budgeting
 * "Food & Dining" would report zero the moment spending moved into
 * "Food & Dining › Groceries".
 */
const spentAgainst = (budget: BudgetRow, spending: { rows: SpendRow[]; total: number }): number => {
  if (!budget.categoryId) return spending.total;

  return round2(
    spending.rows
      .filter((row) => row.categoryId === budget.categoryId || row.parentId === budget.categoryId)
      .reduce((sum, row) => sum + row.total, 0),
  );
};

const toLine = (budget: BudgetRow, spent: number): BudgetLineDto => {
  const budgeted = toNumber(budget.amount);
  const percentUsed = percentUsedOf(spent, budgeted);

  return {
    budgetId: budget.id,
    categoryId: budget.categoryId,
    label: categoryLabel(budget),
    icon: budget.category?.icon ?? null,
    color: budget.category?.color ?? null,
    budgeted,
    spent,
    remaining: round2(budgeted - spent),
    // `Infinity` is not valid JSON — it would serialise to `null` and break the bar.
    percentUsed: Number.isFinite(percentUsed) ? percentUsed : 100,
    status: statusFor(percentUsed),
  };
};

const assertCategoryInFamily = async (familyId: string, categoryId?: string): Promise<string | null> => {
  if (!categoryId) return null;

  const category = await budgetRepository.findCategory(familyId, categoryId);
  if (!category) throw new NotFoundError('Category');

  return category.id;
};

const assertNoDuplicate = async (
  familyId: string,
  categoryId: string | null,
  month: number,
  year: number,
): Promise<void> => {
  const existing = await budgetRepository.findForPeriod(familyId, categoryId, month, year);
  if (!existing) return;

  throw new AppError(
    categoryId ? MSG.BUDGET_DUPLICATE : MSG.BUDGET_OVERALL_DUPLICATE,
    409,
    'BUDGET_DUPLICATE',
  );
};

export const budgetService = {
  async list(actor: ActorContext, query: BudgetPeriodQuery): Promise<BudgetDto[]> {
    const rows = await budgetRepository.listForPeriod(actor.familyId, query.month, query.year);
    return rows.map(toDto);
  },

  async create(actor: ActorContext, input: CreateBudgetInput): Promise<BudgetDto> {
    const categoryId = await assertCategoryInFamily(actor.familyId, input.categoryId);
    if (categoryId) await assertCategoryBudgetCap(actor.familyId, input.month, input.year, 1);
    await assertNoDuplicate(actor.familyId, categoryId, input.month, input.year);

    const row = await budgetRepository.create(actor.familyId, {
      amount: new Prisma.Decimal(input.amount.toFixed(2)),
      month: input.month,
      year: input.year,
      categoryId,
    });

    // Budgets are usually set mid-month, against spending that has already
    // happened — so the new line is checked straight away rather than waiting
    // for the next expense to arrive.
    runBudgetCheck({ familyId: actor.familyId, categoryId, month: row.month, year: row.year });

    return toDto(row);
  },

  async update(actor: ActorContext, id: string, input: UpdateBudgetInput): Promise<BudgetDto> {
    const existing = await budgetRepository.findById(actor.familyId, id);
    if (!existing) throw new NotFoundError('Budget');

    const row = await budgetRepository.update(
      existing.id,
      new Prisma.Decimal(input.amount.toFixed(2)),
    );

    // Lowering a limit can put a line over just as surely as spending more.
    runBudgetCheck({
      familyId: actor.familyId,
      categoryId: row.categoryId,
      month: row.month,
      year: row.year,
    });

    return toDto(row);
  },

  async remove(actor: ActorContext, id: string): Promise<void> {
    const existing = await budgetRepository.findById(actor.familyId, id);
    if (!existing) throw new NotFoundError('Budget');
    await budgetRepository.delete(existing.id);
  },

  /**
   * Re-entering a dozen budgets every month is the reason budgeting gets
   * abandoned, so last month's plan can be carried forward in one call.
   */
  async copy(actor: ActorContext, input: CopyBudgetsInput): Promise<CopyBudgetsResultDto> {
    const source = await budgetRepository.listForPeriod(
      actor.familyId,
      input.fromMonth,
      input.fromYear,
    );

    if (source.length === 0) {
      throw new ValidationError(MSG.VALIDATION_ERROR, { fromMonth: [MSG.BUDGET_COPY_EMPTY] });
    }

    // The cap counts categories new to the target period — re-copying the same
    // five categories is fine, adding a sixth is not.
    const target = await budgetRepository.listForPeriod(
      actor.familyId,
      input.toMonth,
      input.toYear,
    );
    const alreadyBudgeted = new Set(target.map((row) => row.categoryId).filter((id): id is string => id !== null));
    const incomingNewCategories = new Set(
      source.map((row) => row.categoryId).filter((id): id is string => id !== null && !alreadyBudgeted.has(id)),
    ).size;
    if (incomingNewCategories > 0) {
      await assertCategoryBudgetCap(actor.familyId, input.toMonth, input.toYear, incomingNewCategories);
    }

    return budgetRepository.copyPeriod(
      actor.familyId,
      source.map((row) => ({ categoryId: row.categoryId, amount: row.amount })),
      input.toMonth,
      input.toYear,
      input.overwrite,
    );
  },

  /** The planner's main view: every budget line, plus what was spent without one. */
  async vsActual(actor: ActorContext, query: BudgetPeriodQuery): Promise<BudgetVsActualDto> {
    const { from, to } = expenseRepository.periodRange(query);

    const [budgets, spending] = await Promise.all([
      budgetRepository.listForPeriod(actor.familyId, query.month, query.year),
      loadSpending(actor.familyId, from, to),
    ]);

    const overallBudget = budgets.find((budget) => budget.categoryId === null) ?? null;
    const categoryBudgets = budgets.filter((budget) => budget.categoryId !== null);

    const categories = categoryBudgets
      .map((budget) => toLine(budget, spentAgainst(budget, spending)))
      .sort((a, b) => b.spent - a.spent);

    // A category is "budgeted" when it, or its parent, has a line of its own.
    // The family-wide cap deliberately does not count: its whole purpose is to
    // sit above categories that have no individual plan.
    const budgetedCategoryIds = new Set(
      categoryBudgets.map((budget) => budget.categoryId as string),
    );

    const unbudgeted: UnbudgetedLineDto[] = spending.rows
      .filter(
        (row) =>
          row.total > 0 &&
          !(row.categoryId && budgetedCategoryIds.has(row.categoryId)) &&
          !(row.parentId && budgetedCategoryIds.has(row.parentId)),
      )
      .map((row) => ({
        categoryId: row.categoryId,
        label: row.name,
        icon: row.icon,
        color: row.color,
        spent: row.total,
      }))
      .sort((a, b) => b.spent - a.spent);

    return {
      period: { month: query.month, year: query.year, from, to },
      overall: overallBudget ? toLine(overallBudget, spending.total) : null,
      categories,
      unbudgeted,
      totals: {
        categoryBudgeted: round2(
          categoryBudgets.reduce((sum, budget) => sum + toNumber(budget.amount), 0),
        ),
        spent: spending.total,
        unbudgetedSpent: round2(unbudgeted.reduce((sum, line) => sum + line.spent, 0)),
        overspentCount: categories.filter((line) => line.status === 'OVER').length,
      },
    };
  },
};

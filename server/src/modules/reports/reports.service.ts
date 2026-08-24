import { Prisma } from '@prisma/client';
import { reportsRepository } from './reports.repository';
import type {
  CashFlowPointDto,
  CategoryBreakdownRowDto,
  MemberBreakdownRowDto,
  MonthlyReportData,
  MonthlyReportDto,
  ReportPeriodQuery,
  ReportTotalsDto,
  YearlyQuery,
  YearlyReportData,
  YearlyReportDto,
} from './reports.types';
import { periodRange } from '../../shared/utils/date.util';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const UNCATEGORISED_LABEL = 'Uncategorised';

/** Money crosses the wire as a plain number; two decimals always fit a JS float exactly. */
const toNumber = (value: Prisma.Decimal): number => Number(value.toFixed(2));

const round2 = (value: number): number => Math.round(value * 100) / 100;

const percentOf = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

const fullName = (user: { firstName: string; lastName: string }): string =>
  [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown member';

const totalsOf = (income: number, expense: number): ReportTotalsDto => ({
  income: round2(income),
  expense: round2(expense),
  net: round2(income - expense),
});

/**
 * One leaf-level row per category with spend and share — exactly the labels the
 * expense list and budgets use ("Food & Dining › Groceries"), largest first.
 */
const categoryRows = (
  grouped: Awaited<ReturnType<typeof reportsRepository.expenseByCategory>>,
): CategoryBreakdownRowDto[] => {
  const rows = grouped.map((row) => ({
    categoryId: row.categoryId,
    label: row.category
      ? row.category.parent
        ? `${row.category.parent.name} › ${row.category.name}`
        : row.category.name
      : UNCATEGORISED_LABEL,
    total: toNumber(row._sum.amount ?? new Prisma.Decimal(0)),
    count: row._count._all,
  }));

  const grand = round2(rows.reduce((sum, row) => sum + row.total, 0));

  return rows
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((row) => ({ ...row, percentage: percentOf(row.total, grand) }));
};

/** Merges the income and expense aggregations into one row per active member. */
type MemberGroup = { memberId: string; _sum: { amount: Prisma.Decimal | null } };

const memberRows = (
  expenseByMember: MemberGroup[],
  incomeByMember: MemberGroup[],
  profiles: Awaited<ReturnType<typeof reportsRepository.memberProfiles>>,
): MemberBreakdownRowDto[] => {
  const expenseTotal = round2(
    expenseByMember.reduce((sum, row) => sum + toNumber(row._sum.amount ?? new Prisma.Decimal(0)), 0),
  );

  const memberIds = [...new Set([...expenseByMember, ...incomeByMember].map((r) => r.memberId))];

  return memberIds
    .map((memberId) => {
      const profile = profiles.find((candidate) => candidate.id === memberId);
      const expense = toNumber(
        expenseByMember.find((row) => row.memberId === memberId)?._sum.amount ??
          new Prisma.Decimal(0),
      );
      const income = toNumber(
        incomeByMember.find((row) => row.memberId === memberId)?._sum.amount ??
          new Prisma.Decimal(0),
      );
      return {
        memberId,
        name: profile ? fullName(profile.user) : 'Unknown member',
        role: profile?.role ?? 'MEMBER',
        income: round2(income),
        expense: round2(expense),
        percentage: percentOf(expense, expenseTotal),
      };
    })
    .sort((a, b) => b.expense - a.expense || b.income - a.income);
};

export const reportsService = {
  /** The month's P&L plus where the money went, by category and by member. */
  async monthly(familyId: string, query: ReportPeriodQuery): Promise<MonthlyReportDto> {
    const { from, to } = periodRange(query);

    const [expenseByCategory, expenseByMember, incomeByMember] = await Promise.all([
      reportsRepository.expenseByCategory(familyId, from, to),
      reportsRepository.expenseByMember(familyId, from, to),
      reportsRepository.incomeByMember(familyId, from, to),
    ]);

    const profiles = await reportsRepository.memberProfiles(
      familyId,
      [...expenseByMember, ...incomeByMember].map((row) => row.memberId),
    );
    const byMember = memberRows(expenseByMember, incomeByMember, profiles);

    return {
      period: { ...query },
      totals: totalsOf(
        byMember.reduce((sum, row) => sum + row.income, 0),
        byMember.reduce((sum, row) => sum + row.expense, 0),
      ),
      byCategory: categoryRows(expenseByCategory),
      byMember,
    };
  },

  /** Twelve monthly buckets for one year — the same series the dashboard charts. */
  async yearly(familyId: string, query: YearlyQuery): Promise<YearlyReportDto> {
    const [monthlyIncome, monthlyExpense] = await Promise.all([
      reportsRepository.monthlyIncomeTotals(familyId, query.year),
      reportsRepository.monthlyExpenseTotals(familyId, query.year),
    ]);

    const months: CashFlowPointDto[] = MONTH_LABELS.map((label, index) => {
      const income = toNumber(monthlyIncome[index].total);
      const expense = toNumber(monthlyExpense[index].total);
      return { month: index + 1, label, income, expense, net: round2(income - expense) };
    });

    return {
      year: query.year,
      months,
      totals: totalsOf(
        months.reduce((sum, point) => sum + point.income, 0),
        months.reduce((sum, point) => sum + point.expense, 0),
      ),
    };
  },

  /** Category spend over any window: pass `month` for one month, omit it for the year. */
  async categoryWise(familyId: string, query: { month?: number; year: number }) {
    const { from, to } = periodRange(query);
    return categoryRows(await reportsRepository.expenseByCategory(familyId, from, to));
  },

  /** Member spend/earn over any window, same flexibility as category-wise. */
  async memberWise(familyId: string, query: { month?: number; year: number }) {
    const { from, to } = periodRange(query);

    const [expenseByMember, incomeByMember] = await Promise.all([
      reportsRepository.expenseByMember(familyId, from, to),
      reportsRepository.incomeByMember(familyId, from, to),
    ]);
    const profiles = await reportsRepository.memberProfiles(
      familyId,
      [...expenseByMember, ...incomeByMember].map((row) => row.memberId),
    );

    return memberRows(expenseByMember, incomeByMember, profiles);
  },

  /** Everything the PDF builder needs for a monthly report, pre-assembled. */
  async monthlyForExport(familyId: string, query: ReportPeriodQuery): Promise<MonthlyReportData> {
    const [report, familyName] = await Promise.all([
      this.monthly(familyId, query),
      reportsRepository.familyName(familyId),
    ]);
    return { ...report, familyName };
  },

  /** Everything the Excel builder needs for a yearly report, pre-assembled. */
  async yearlyForExport(familyId: string, query: YearlyQuery): Promise<YearlyReportData> {
    const [report, familyName] = await Promise.all([
      this.yearly(familyId, query),
      reportsRepository.familyName(familyId),
    ]);
    return { ...report, familyName };
  },
};

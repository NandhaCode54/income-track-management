import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/dashboard.service';
import { QK } from '@/constants/queryKeys';
import type { DashboardPeriod } from '@/types/dashboard.types';

/**
 * The dashboard is read-only, so there are no mutations here. Every other
 * module's writes invalidate the `['dashboard']` prefix instead — the page reads
 * across income, expenses and budgets, so any of them moving invalidates all of it.
 *
 * `keepPreviousData` on each query is what stops the whole page collapsing into
 * skeletons when the month is switched: the previous month stays on screen,
 * dimmed by the caller, until the new one arrives.
 */

export const useDashboardSummary = (period: DashboardPeriod) =>
  useQuery({
    queryKey: QK.DASHBOARD_SUMMARY(period),
    queryFn: () => dashboardApi.summary(period),
    placeholderData: keepPreviousData,
  });

export const useDashboardCharts = (period: DashboardPeriod) =>
  useQuery({
    queryKey: QK.DASHBOARD_CHARTS(period),
    queryFn: () => dashboardApi.charts(period),
    placeholderData: keepPreviousData,
  });

/**
 * Not period-scoped: "what do we owe next" is always measured from today, so
 * changing the month above must not change this list.
 */
export const useUpcomingPayments = (days: number) =>
  useQuery({
    queryKey: QK.DASHBOARD_UPCOMING(days),
    queryFn: () => dashboardApi.upcoming(days),
    placeholderData: keepPreviousData,
  });

export const useTopExpenses = (period: DashboardPeriod, limit?: number) =>
  useQuery({
    queryKey: QK.DASHBOARD_TOP_EXPENSES({ ...period, limit }),
    queryFn: () => dashboardApi.topExpenses(period, limit),
    placeholderData: keepPreviousData,
  });

export const useFamilyContribution = (period: DashboardPeriod) =>
  useQuery({
    queryKey: QK.DASHBOARD_CONTRIBUTION(period),
    queryFn: () => dashboardApi.familyContribution(period),
    placeholderData: keepPreviousData,
  });

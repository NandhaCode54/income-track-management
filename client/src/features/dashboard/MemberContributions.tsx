import { Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/common/EmptyState';
import { useCurrency } from '@/hooks/useCurrency';
import { CHART_COLORS } from '@/components/charts/chart.tokens';
import type { FamilyContribution } from '@/types/dashboard.types';

interface MemberContributionsProps {
  data?: FamilyContribution;
  isLoading: boolean;
  periodLabel: string;
}

/**
 * Who earned and who spent.
 *
 * A **ranked magnitude list**, not a categorical chart: every row measures the
 * same two things, so rank carries the comparison and each row states its own
 * numbers in text. The two mini-bars are scaled against the family's largest
 * figure of that kind, so the leader always fills its track.
 */
const MemberContributions = ({ data, isLoading, periodLabel }: MemberContributionsProps) => {
  const { format } = useCurrency();

  const members = data?.members ?? [];
  const largestIncome = Math.max(...members.map((member) => member.income), 0);
  const largestExpense = Math.max(...members.map((member) => member.expense), 0);
  const hasActivity = members.some((member) => member.income > 0 || member.expense > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Who contributed what</CardTitle>
        <CardDescription>Income earned and money spent per member in {periodLabel}.</CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-lg bg-muted/40" />
            ))}
          </div>
        ) : !hasActivity ? (
          <EmptyState
            icon={Users}
            title={`No activity in ${periodLabel}`}
            description="Once the family records income or expenses this month, the split appears here."
          />
        ) : (
          <ul className="space-y-5">
            {members.map((member) => (
              <li key={member.memberId} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">
                    {member.name}
                    {!member.isActive && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (no longer in the family)
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {member.net < 0
                      ? `${format(Math.abs(member.net))} net out`
                      : `${format(member.net)} net in`}
                  </span>
                </div>

                <dl className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <dt className="w-16 shrink-0 text-xs text-muted-foreground">Earned</dt>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${largestIncome === 0 ? 0 : (member.income / largestIncome) * 100}%`,
                          backgroundColor: CHART_COLORS.income,
                        }}
                      />
                    </div>
                    <dd className="w-28 shrink-0 text-right text-xs tabular-nums">
                      {format(member.income)}
                      <span className="ml-1.5 text-muted-foreground">{member.incomeShare}%</span>
                    </dd>
                  </div>

                  <div className="flex items-center gap-3">
                    <dt className="w-16 shrink-0 text-xs text-muted-foreground">Spent</dt>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${largestExpense === 0 ? 0 : (member.expense / largestExpense) * 100}%`,
                          backgroundColor: CHART_COLORS.expense,
                        }}
                      />
                    </div>
                    <dd className="w-28 shrink-0 text-right text-xs tabular-nums">
                      {format(member.expense)}
                      <span className="ml-1.5 text-muted-foreground">{member.expenseShare}%</span>
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberContributions;

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import type { IncomeBreakdown } from '@/types/income.types';

interface BreakdownCardProps {
  title: string;
  description: string;
  rows: IncomeBreakdown[];
  emptyLabel: string;
}

/**
 * A ranked magnitude list, not a categorical chart: every row measures the same
 * thing, so all bars share one hue and rank carries the comparison. Each row is
 * labelled with its name, amount and share in text, so nothing is encoded by
 * colour alone.
 */
const BreakdownCard = ({ title, description, rows, emptyLabel }: BreakdownCardProps) => {
  const { format } = useCurrency();
  const largest = rows[0]?.total ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li key={row.key} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{row.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {format(row.total)}
                    <span className="ml-2 text-muted-foreground">{row.percentage}%</span>
                  </span>
                </div>
                {/* Scaled against the leader so the top row always fills the track. */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400"
                    style={{ width: `${largest === 0 ? 0 : (row.total / largest) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

interface IncomeBreakdownProps {
  byType: IncomeBreakdown[];
  byMember: IncomeBreakdown[];
}

const IncomeBreakdownSection = ({ byType, byMember }: IncomeBreakdownProps) => (
  <div className="grid gap-4 lg:grid-cols-2">
    <BreakdownCard
      title="By source"
      description="Where this period's income came from."
      rows={byType}
      emptyLabel="No income recorded for this period."
    />
    <BreakdownCard
      title="By member"
      description="Who contributed what."
      rows={byMember}
      emptyLabel="No income recorded for this period."
    />
  </div>
);

export default IncomeBreakdownSection;

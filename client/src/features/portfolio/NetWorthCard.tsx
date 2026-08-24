import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { useNetWorth } from './portfolio.hooks';

/** Shown on every portfolio section page; one query serves all of them. */
const NetWorthCard = () => {
  const { format } = useCurrency();
  const query = useNetWorth(true);

  const breakdown: [label: string, value: number | undefined, tone: 'pos' | 'neg' | undefined][] =
    [
      ['Investments', query.data?.investments, 'pos'],
      ['Assets', query.data?.assets, 'pos'],
      ['Liabilities', query.data?.liabilities, 'neg'],
    ];

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-6 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2.5">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Net worth</p>
            <p className="text-xl font-semibold" data-testid="net-worth-value">
              {query.isPending ? (
                '…'
              ) : query.data ? (
                format(query.data.netWorth)
              ) : (
                <span className="text-sm text-muted-foreground">Unavailable</span>
              )}
            </p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-3 gap-4 sm:max-w-md">
          {breakdown.map(([label, value, tone]) => (
            <div key={label}>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {tone === 'neg' ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                {label}
              </p>
              <p className={`font-medium ${tone === 'neg' ? 'text-destructive' : ''}`}>
                {value === undefined ? '—' : format(value)}
              </p>
            </div>
          ))}
        </div>

        <p className="w-full text-xs text-muted-foreground sm:w-auto">
          Investments + assets − liabilities
        </p>
      </CardContent>
    </Card>
  );
};

export default NetWorthCard;

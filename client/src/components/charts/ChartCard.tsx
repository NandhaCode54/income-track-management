import { useId, useState, type ReactNode } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  description?: string;
  /** The legend, rendered under the title where it reads before the plot does. */
  legend?: ReactNode;
  chart: ReactNode;
  /** The same numbers as a table. Not optional — it is the chart's accessible twin. */
  table: ReactNode;
  /** Shown instead of both views when the period has nothing in it. */
  empty?: ReactNode;
  isEmpty?: boolean;
  /**
   * A refetch is in flight and the visible data is the previous period's. The body
   * dims rather than collapsing to a skeleton, so nothing jumps.
   */
  isStale?: boolean;
  className?: string;
}

type View = 'chart' | 'table';

const VIEWS: { id: View; label: string; icon: typeof BarChart3 }[] = [
  { id: 'chart', label: 'Chart', icon: BarChart3 },
  { id: 'table', label: 'Table', icon: Table2 },
];

/**
 * A chart and its table twin in one card, with a toggle between them.
 *
 * The table is not a fallback for failure — it is the WCAG-clean equivalent of the
 * plot, always one click away, so no value on this page is reachable only by
 * hovering a mark or by telling two colours apart.
 */
const ChartCard = ({
  title,
  description,
  legend,
  chart,
  table,
  empty,
  isEmpty = false,
  isStale = false,
  className,
}: ChartCardProps) => {
  const [view, setView] = useState<View>('chart');
  const panelId = useId();

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
          {!isEmpty && legend}
        </div>

        {!isEmpty && (
          <div role="tablist" aria-label={`${title} view`} className="flex shrink-0 rounded-lg border p-0.5">
            {VIEWS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={view === option.id}
                aria-controls={panelId}
                onClick={() => setView(option.id)}
                className={cn(
                  // 28px tall inside a 32px control — comfortably past a pointer's minimum.
                  'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                  view === option.id
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <option.icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent
        id={panelId}
        role="tabpanel"
        className={cn('transition-opacity', isStale && 'opacity-60')}
      >
        {isEmpty ? empty : view === 'chart' ? chart : table}
      </CardContent>
    </Card>
  );
};

export default ChartCard;

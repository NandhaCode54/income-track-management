import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { STATUS_LABELS, STATUS_STYLES } from './budget.constants';
import type { BudgetStatus } from '@/types/budget.types';

interface BudgetProgressProps {
  budgeted: number;
  spent: number;
  percentUsed: number;
  status: BudgetStatus;
  /** Renders the track taller, for the family-wide line. */
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * The budget bar. Two things it deliberately does:
 *
 * - **Caps the fill at 100%** while still printing the true percentage, so a
 *   line at 320% does not blow out the layout — the number carries the overshoot.
 * - **States the status in words** next to the bar, so red/amber/green is a
 *   reinforcement rather than the only signal.
 */
const BudgetProgress = ({
  budgeted,
  spent,
  percentUsed,
  status,
  size = 'sm',
  className,
}: BudgetProgressProps) => {
  const { format } = useCurrency();
  const styles = STATUS_STYLES[status];
  const remaining = budgeted - spent;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-muted',
          size === 'lg' ? 'h-3' : 'h-2',
        )}
        role="progressbar"
        aria-valuenow={Math.round(percentUsed)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${STATUS_LABELS[status]} — ${Math.round(percentUsed)}% of budget used`}
      >
        <div
          className={cn('h-full rounded-full transition-all', styles.bar)}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">
          {format(spent)} of {format(budgeted)}
        </span>
        <span className={cn('font-medium tabular-nums', styles.text)}>
          {percentUsed}% ·{' '}
          {remaining >= 0 ? `${format(remaining)} left` : `${format(Math.abs(remaining))} over`}
        </span>
      </div>
    </div>
  );
};

export default BudgetProgress;

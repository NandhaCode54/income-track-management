import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import type { EmiProgress } from '@/types/emi.types';

interface EmiProgressBarProps {
  progress: EmiProgress;
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * How far through a loan is.
 *
 * The bar measures **instalments settled**, not money repaid, and the two are
 * not the same thing: by the halfway instalment of a long loan far more than
 * half the cash has gone out, because the early instalments are mostly interest.
 * Counting instalments is the honest answer to "how much further" — it is the
 * one that predicts when this ends.
 *
 * Arrears turn the fill red rather than adding a second bar, and the count is
 * always stated in words underneath, so the colour is never the only signal.
 */
const EmiProgressBar = ({ progress, size = 'sm', className }: EmiProgressBarProps) => {
  const { format } = useCurrency();
  const behind = progress.overdueCount > 0;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className={cn('w-full overflow-hidden rounded-full bg-muted', size === 'lg' ? 'h-3' : 'h-2')}
        role="progressbar"
        aria-valuenow={Math.round(progress.percentPaid)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${progress.paidCount} of ${progress.totalCount} instalments paid`}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all',
            behind ? 'bg-red-500' : 'bg-emerald-500',
          )}
          style={{ width: `${Math.min(progress.percentPaid, 100)}%` }}
        />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">
          {progress.paidCount} of {progress.totalCount} paid
          {behind && (
            <span className="ml-1.5 font-medium text-red-600 dark:text-red-400">
              · {progress.overdueCount} missed ({format(progress.overdueAmount)})
            </span>
          )}
        </span>
        <span className="font-medium tabular-nums text-muted-foreground">
          {format(progress.remainingAmount)} left
        </span>
      </div>
    </div>
  );
};

export default EmiProgressBar;

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { MONTH_NAMES } from '@/utils/formatDate';
import { useCopyBudgets } from './budget.hooks';
import type { BudgetPeriod } from '@/types/budget.types';

interface CopyBudgetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The month being copied *into* — the one currently on screen. */
  target: BudgetPeriod;
}

/** The month before `period`, rolling the year back at January. */
const previousMonth = (period: BudgetPeriod): BudgetPeriod =>
  period.month === 1
    ? { month: 12, year: period.year - 1 }
    : { month: period.month - 1, year: period.year };

const years = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index);

const CopyBudgetsDialog = ({ open, onOpenChange, target }: CopyBudgetsDialogProps) => {
  const copyBudgets = useCopyBudgets();
  const [source, setSource] = useState<BudgetPeriod>(() => previousMonth(target));
  const [overwrite, setOverwrite] = useState(false);

  // Last month is almost always the answer, so re-default whenever the target moves.
  useEffect(() => {
    if (open) setSource(previousMonth(target));
  }, [open, target]);

  const isSamePeriod = source.month === target.month && source.year === target.year;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copy budgets</DialogTitle>
          <DialogDescription>
            Carry a previous month's limits into {MONTH_NAMES[target.month - 1]} {target.year}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="copyFrom">Copy from</Label>
            <div className="flex gap-2">
              <Select
                id="copyFrom"
                value={source.month}
                onChange={(event) =>
                  setSource((current) => ({ ...current, month: Number(event.target.value) }))
                }
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </Select>
              <Select
                className="w-32"
                aria-label="Copy from year"
                value={source.year}
                onChange={(event) =>
                  setSource((current) => ({ ...current, year: Number(event.target.value) }))
                }
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </div>
            {isSamePeriod && (
              <p className="text-sm text-destructive">Choose a different month to copy from.</p>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              checked={overwrite}
              onChange={(event) => setOverwrite(event.target.checked)}
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">Replace limits already set</span>
              <span className="block text-xs text-muted-foreground">
                Off by default, so budgets you have already adjusted this month are left alone.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isSamePeriod || copyBudgets.isPending}
            onClick={() =>
              copyBudgets.mutate(
                {
                  fromMonth: source.month,
                  fromYear: source.year,
                  toMonth: target.month,
                  toYear: target.year,
                  overwrite,
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            {copyBudgets.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CopyBudgetsDialog;

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/hooks/useCurrency';
import { toDateInputValue } from '@/utils/formatDate';
import type { Goal } from '@/types/goals.types';
import { contributeFormSchema, type ContributeForm } from './goals.schemas';
import { useContributeToGoal } from './goals.hooks';

interface ContributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
}

const ContributeDialog = ({ open, onOpenChange, goal }: ContributeDialogProps) => {
  const { symbol, format } = useCurrency();
  const contribute = useContributeToGoal();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContributeForm>({
    resolver: zodResolver(contributeFormSchema),
    defaultValues: { amount: '', date: toDateInputValue(new Date()), note: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({ amount: '', date: toDateInputValue(new Date()), note: '' });
  }, [open, goal, reset]);

  const remaining = goal ? Math.max(goal.targetAmount - goal.savedAmount, 0) : 0;

  const onSubmit = (v: ContributeForm) => {
    if (!goal) return;
    contribute.mutate(
      {
        id: goal.id,
        payload: {
          amount: Number(v.amount),
          ...(v.date ? { date: new Date(v.date).toISOString() } : {}),
          ...(v.note ? { note: v.note } : {}),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to {goal?.name ?? 'goal'}</DialogTitle>
          <DialogDescription>
            {remaining > 0
              ? `${format(remaining)} still to go.`
              : 'This goal is already complete — a contribution will be recorded anyway.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contributionAmount">Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {symbol}
                </span>
                <Input
                  id="contributionAmount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className="pl-8"
                  aria-invalid={!!errors.amount}
                  {...register('amount')}
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contributionDate">Date</Label>
              <Input id="contributionDate" type="date" {...register('date')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contributionNote">Note (optional)</Label>
            <Textarea
              id="contributionNote"
              rows={2}
              placeholder="Bonus, festival gift…"
              aria-invalid={!!errors.note}
              {...register('note')}
            />
            {errors.note && <p className="text-sm text-destructive">{errors.note.message}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={contribute.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={contribute.isPending}>
              {contribute.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add contribution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContributeDialog;

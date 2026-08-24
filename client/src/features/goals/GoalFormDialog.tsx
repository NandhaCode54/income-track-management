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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Goal } from '@/types/goals.types';
import { GOAL_TYPE_LABELS } from '@/types/goals.types';
import { goalFormSchema, type GoalForm } from './goals.schemas';
import { useCreateGoal, useUpdateGoal } from './goals.hooks';

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set the dialog edits this goal instead of creating one. */
  goal?: Goal | null;
}

const GoalFormDialog = ({ open, onOpenChange, goal }: GoalFormDialogProps) => {
  const editing = !!goal;
  const create = useCreateGoal({ onSuccess: () => onOpenChange(false) });
  const update = useUpdateGoal({ onSuccess: () => onOpenChange(false) });
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalForm>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: '',
      type: 'CUSTOM',
      targetAmount: '',
      deadline: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: goal?.name ?? '',
      type: goal?.type ?? 'CUSTOM',
      targetAmount: goal ? String(goal.targetAmount) : '',
      deadline: goal?.deadline
        ? new Date(goal.deadline).toISOString().slice(0, 10)
        : '',
      notes: goal?.notes ?? '',
    });
  }, [open, goal, reset]);

  const onSubmit = (v: GoalForm) => {
    const payload = {
      name: v.name,
      type: v.type,
      targetAmount: Number(v.targetAmount),
      ...(v.deadline ? { deadline: new Date(v.deadline).toISOString() } : {}),
      ...(v.notes ? { notes: v.notes } : {}),
    };
    if (editing && goal) update.mutate({ id: goal.id, payload });
    else create.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit goal' : 'Add a savings goal'}</DialogTitle>
          <DialogDescription>
            Set a target the whole family can contribute towards.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goalName">Name</Label>
              <Input
                id="goalName"
                placeholder="Emergency fund"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalType">Type</Label>
              <Select id="goalType" {...register('type')}>
                {Object.entries(GOAL_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalTarget">Target amount</Label>
              <Input
                id="goalTarget"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                aria-invalid={!!errors.targetAmount}
                {...register('targetAmount')}
              />
              {errors.targetAmount && (
                <p className="text-sm text-destructive">{errors.targetAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalDeadline">Deadline (optional)</Label>
              <Input id="goalDeadline" type="date" {...register('deadline')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goalNotes">Notes (optional)</Label>
            <Textarea id="goalNotes" rows={2} aria-invalid={!!errors.notes} {...register('notes')} />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GoalFormDialog;

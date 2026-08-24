import { useState } from 'react';
import { CircleCheckBig, Goal as GoalIcon, Loader2, Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/utils/formatDate';
import type { Goal } from '@/types/goals.types';
import { GOAL_TYPE_LABELS } from '@/types/goals.types';
import { useGoals, useRemoveGoal } from '@/features/goals/goals.hooks';
import GoalFormDialog from '@/features/goals/GoalFormDialog';
import ContributeDialog from '@/features/goals/ContributeDialog';

const GoalsPage = () => {
  const { format } = useCurrency();
  const { can } = usePermission();

  const goals = useGoals();
  const removeGoal = useRemoveGoal();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contributing, setContributing] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals & Savings"
        description="Set family targets and see every contribution move them forward."
        actions={
          can('FINANCE_WRITE') ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add goal
            </Button>
          ) : undefined
        }
      />

      {goals.isPending ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !goals.data?.length ? (
        <Card>
          <EmptyState
            icon={GoalIcon}
            title="No savings goals yet"
            description="Create a target and record contributions as your family saves."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.data.map((goal) => (
            <Card key={goal.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{goal.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {GOAL_TYPE_LABELS[goal.type]}
                      {goal.deadline ? ` · by ${formatDate(goal.deadline)}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {goal.isCompleted && (
                      <Badge variant="success">
                        <CircleCheckBig className="mr-1 h-3 w-3" />
                        Achieved
                      </Badge>
                    )}
                    {can('FINANCE_WRITE') && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(goal)}
                        aria-label={`Edit ${goal.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {can('FINANCE_DELETE') && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(goal)}
                        aria-label={`Delete ${goal.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    {/* Progress is clamped server-side; the bar never overflows. */}
                    <span>{format(goal.savedAmount)} of {format(goal.targetAmount)}</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${goal.isCompleted ? 'bg-emerald-500' : 'bg-primary'}`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>

                {can('FINANCE_WRITE') ? (
                  <Button size="sm" variant="outline" onClick={() => setContributing(goal)}>
                    <PiggyBank className="h-4 w-4" />
                    Add contribution
                  </Button>
                ) : goal.contributions.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {goal.contributions.length} contribution
                    {goal.contributions.length === 1 ? '' : 's'} so far.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {can('FINANCE_WRITE') && (
        <>
          <GoalFormDialog open={formOpen} onOpenChange={setFormOpen} goal={editing} />
          <ContributeDialog
            open={!!contributing}
            onOpenChange={(open) => !open && setContributing(null)}
            goal={contributing}
          />
        </>
      )}

      {can('FINANCE_DELETE') && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title="Delete this goal?"
          description={
            deleting
              ? `"${deleting.name}" and its ${deleting.contributions.length} recorded contribution${
                  deleting.contributions.length === 1 ? '' : 's'
                } will be removed for everyone in the family.`
              : undefined
          }
          confirmLabel="Delete"
          destructive
          loading={removeGoal.isPending}
          onConfirm={() => {
            if (!deleting) return;
            removeGoal.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
          }}
        />
      )}
    </div>
  );
};

export default GoalsPage;

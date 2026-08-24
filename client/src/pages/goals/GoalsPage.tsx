import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Goal, Loader2, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/services/api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';

type GoalRow = { id: string; name: string; type: string; targetAmount: number; savedAmount: number; progress: number; deadline: string | null; isCompleted: boolean };
const GoalsPage = () => {
  const { format } = useCurrency(); const { can } = usePermission(); const cache = useQueryClient(); const [adding, setAdding] = useState(false); const [amounts, setAmounts] = useState<Record<string, string>>({});
  const goals = useQuery({ queryKey: ['goals'], queryFn: async () => { const { data } = await api.get<ApiEnvelope<{ goals: GoalRow[] }>>('/goals'); return unwrap(data).goals; } });
  const invalidate = () => cache.invalidateQueries({ queryKey: ['goals'] });
  const create = useMutation({ mutationFn: (payload: object) => api.post('/goals', payload), onSuccess: () => { invalidate(); setAdding(false); toast.success('Goal created'); }, onError: (e) => toast.error('Could not create goal', getApiErrorMessage(e)) });
  const contribute = useMutation({ mutationFn: ({ id, amount }: { id: string; amount: number }) => api.post(`/goals/${id}/contributions`, { amount }), onSuccess: () => { invalidate(); toast.success('Contribution added'); }, onError: (e) => toast.error('Could not add contribution', getApiErrorMessage(e)) });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/goals/${id}`), onSuccess: invalidate, onError: (e) => toast.error('Could not delete goal', getApiErrorMessage(e)) });
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); create.mutate({ ...data, targetAmount: Number(data.targetAmount), ...(data.deadline ? { deadline: new Date(String(data.deadline)).toISOString() } : {}) }); };
  return <div className="space-y-6"><PageHeader title="Goals & Savings" description="Set family targets and see every contribution move them forward." actions={can('FINANCE_WRITE') ? <Button onClick={() => setAdding(!adding)}><Plus className="h-4 w-4" />Add goal</Button> : undefined} />
    {adding && <Card><CardContent className="p-5"><form onSubmit={submit} className="grid gap-3 md:grid-cols-3"><Input name="name" required placeholder="Goal name" /><Input name="targetAmount" type="number" step="0.01" min="0.01" required placeholder="Target amount" /><Select name="type" defaultValue="CUSTOM"><option value="CUSTOM">Custom</option><option value="EMERGENCY_FUND">Emergency fund</option><option value="HOUSE">House</option><option value="CAR">Car</option><option value="VACATION">Vacation</option><option value="EDUCATION">Education</option><option value="RETIREMENT">Retirement</option></Select><Input name="deadline" type="date" /><div className="flex gap-2"><Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button><Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button></div></form></CardContent></Card>}
    {goals.isPending ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : !goals.data?.length ? <Card><EmptyState icon={Goal} title="No savings goals yet" description="Create a target and record contributions as your family saves." /></Card> : <div className="grid gap-4 md:grid-cols-2">{goals.data.map((goal) => <Card key={goal.id}><CardContent className="space-y-4 p-5"><div className="flex justify-between gap-3"><div><h2 className="font-semibold">{goal.name}</h2><p className="text-sm text-muted-foreground">{goal.type.replaceAll('_', ' ')}</p></div>{can('FINANCE_DELETE') && <Button size="icon" variant="ghost" onClick={() => remove.mutate(goal.id)} aria-label="Delete goal"><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div><div><div className="mb-1 flex justify-between text-sm"><span>{format(goal.savedAmount)} saved</span><span>{goal.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${goal.progress}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">Target {format(goal.targetAmount)}{goal.deadline ? ` · ${new Date(goal.deadline).toLocaleDateString()}` : ''}</p></div>{!goal.isCompleted && can('FINANCE_WRITE') && <div className="flex gap-2"><Input type="number" min="0.01" step="0.01" placeholder="Contribution" value={amounts[goal.id] ?? ''} onChange={(e) => setAmounts({ ...amounts, [goal.id]: e.target.value })} /><Button size="sm" onClick={() => { const amount = Number(amounts[goal.id]); if (amount > 0) contribute.mutate({ id: goal.id, amount }); }}>Add</Button></div>}{goal.isCompleted && <p className="text-sm font-medium text-emerald-600">Goal achieved</p>}</CardContent></Card>)}</div>}
  </div>;
};
export default GoalsPage;

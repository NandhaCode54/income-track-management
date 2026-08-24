import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Check, Loader2, Plus, Trash2 } from 'lucide-react';
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

type Kind = 'bills' | 'rent' | 'school-fees';
type Row = { id: string; amount: number; dueDate: string; status: string; name?: string; propertyName?: string; studentName?: string; school?: string };
const labels: Record<Kind, { title: string; singular: string; description: string }> = {
  bills: { title: 'Bills', singular: 'bill', description: 'Track household bills and mark them paid when they clear.' },
  rent: { title: 'Rent', singular: 'rent payment', description: 'Keep monthly rent obligations and their payment status together.' },
  'school-fees': { title: 'School Fees', singular: 'school fee', description: 'Track each student’s term fees and due dates.' },
};

const PaymentTrackerPage = ({ kind }: { kind: Kind }) => {
  const meta = labels[kind]; const { format } = useCurrency(); const { can } = usePermission(); const queryClient = useQueryClient();
  const [form, setForm] = useState(false); const [status, setStatus] = useState('');
  const query = useQuery({ queryKey: [kind, status], queryFn: async () => { const { data } = await api.get<ApiEnvelope<{ items: Row[] }>>(`/${kind}`, { params: status ? { status } : {} }); return unwrap(data).items; } });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [kind] });
  const create = useMutation({ mutationFn: async (payload: Record<string, unknown>) => api.post(`/${kind}`, payload), onSuccess: () => { invalidate(); setForm(false); toast.success(`${meta.title} added`); }, onError: (e) => toast.error(`Could not add ${meta.singular}`, getApiErrorMessage(e)) });
  const pay = useMutation({ mutationFn: (id: string) => api.post(`/${kind}/${id}/payment`, { status: 'PAID' }), onSuccess: () => { invalidate(); toast.success('Payment recorded'); }, onError: (e) => toast.error('Could not record payment', getApiErrorMessage(e)) });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/${kind}/${id}`), onSuccess: invalidate, onError: (e) => toast.error('Could not delete item', getApiErrorMessage(e)) });
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const amount = Number(data.amount); const base = { ...data, amount, dueDate: new Date(String(data.dueDate)).toISOString() } as Record<string, unknown>; if (kind === 'bills') create.mutate({ ...base, type: data.type || 'OTHER', isRecurring: true, frequency: 'MONTHLY' }); else if (kind === 'rent') create.mutate({ ...base, dueDay: Number(data.dueDay), month: Number(data.month), year: Number(data.year) }); else create.mutate(base); };
  const today = new Date().toISOString().slice(0, 10);
  return <div className="space-y-6"><PageHeader title={meta.title} description={meta.description} actions={can('FINANCE_WRITE') ? <Button onClick={() => setForm(!form)}><Plus className="h-4 w-4" />Add {meta.singular}</Button> : undefined} />
    {form && <Card><CardContent className="p-5"><form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
      {kind === 'bills' && <><Input name="name" required placeholder="Bill name" /><Select name="type" defaultValue="OTHER"><option value="OTHER">Other</option><option value="ELECTRICITY">Electricity</option><option value="WATER">Water</option><option value="INTERNET">Internet</option><option value="PHONE">Phone</option><option value="INSURANCE">Insurance</option></Select></>}
      {kind === 'rent' && <><Input name="propertyName" required placeholder="Property name" /><Input name="landlordName" placeholder="Landlord name" /><Input name="dueDay" type="number" min="1" max="31" required placeholder="Due day" /><Input name="month" type="number" min="1" max="12" required placeholder="Month" /><Input name="year" type="number" min="2020" required placeholder="Year" /></>}
      {kind === 'school-fees' && <><Input name="studentName" required placeholder="Student name" /><Input name="school" required placeholder="School" /><Input name="class" placeholder="Class" /></>}
      <Input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount" /><Input name="dueDate" type="date" defaultValue={today} required /><div className="flex gap-2"><Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button><Button type="button" variant="outline" onClick={() => setForm(false)}>Cancel</Button></div>
    </form></CardContent></Card>}
    <Card><CardContent className="p-4"><Select className="w-44" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="OVERDUE">Overdue</option></Select></CardContent></Card>
    <Card><CardContent className="p-0">{query.isPending ? <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div> : !query.data?.length ? <EmptyState icon={CalendarClock} title={`No ${meta.title.toLowerCase()} yet`} description={`Add a ${meta.singular} to start tracking it.`} /> : <div className="divide-y">{query.data.map((item) => <div key={item.id} className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="font-medium">{item.name ?? item.propertyName ?? item.studentName}</p><p className="text-sm text-muted-foreground">{item.school ? `${item.school} · ` : ''}Due {new Date(item.dueDate).toLocaleDateString()} · {item.status}</p></div><span className="font-semibold">{format(Number(item.amount))}</span>{item.status !== 'PAID' && can('FINANCE_WRITE') && <Button size="sm" variant="outline" onClick={() => pay.mutate(item.id)}><Check className="h-4 w-4" />Paid</Button>}{can('FINANCE_DELETE') && <Button size="icon" variant="ghost" onClick={() => remove.mutate(item.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>)}</div>}</CardContent></Card>
  </div>;
};
export default PaymentTrackerPage;

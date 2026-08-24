import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleDollarSign, Loader2, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';

type Fund = { id: string; name: string; organizer: string | null; totalAmount: number; monthlyAmount: number; totalMembers: number; startDate: string; endDate: string; dueDay: number; isActive: boolean; payments: { id: string; amount: number; status: string }[] };
const ChitFundPage = () => {
  const { format } = useCurrency(); const { can } = usePermission(); const cache = useQueryClient(); const [adding, setAdding] = useState(false);
  const funds = useQuery({ queryKey: ['chit-funds'], queryFn: async () => { const { data } = await api.get<ApiEnvelope<{ chitFunds: Fund[] }>>('/chit-funds'); return unwrap(data).chitFunds; } });
  const refresh = () => cache.invalidateQueries({ queryKey: ['chit-funds'] });
  const create = useMutation({ mutationFn: (payload: object) => api.post('/chit-funds', payload), onSuccess: () => { refresh(); setAdding(false); toast.success('Chit fund added'); }, onError: (e) => toast.error('Could not add chit fund', getApiErrorMessage(e)) });
  const pay = useMutation({ mutationFn: ({ id, amount }: { id: string; amount: number }) => { const now = new Date(); return api.post(`/chit-funds/${id}/payments`, { month: now.getMonth() + 1, year: now.getFullYear(), amount }); }, onSuccess: () => { refresh(); toast.success('Monthly payment recorded'); }, onError: (e) => toast.error('Could not record payment', getApiErrorMessage(e)) });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/chit-funds/${id}`), onSuccess: refresh, onError: (e) => toast.error('Could not delete chit fund', getApiErrorMessage(e)) });
  const submit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); create.mutate({ ...d, totalAmount: Number(d.totalAmount), monthlyAmount: Number(d.monthlyAmount), totalMembers: Number(d.totalMembers), dueDay: Number(d.dueDay), startDate: new Date(String(d.startDate)).toISOString(), endDate: new Date(String(d.endDate)).toISOString() }); };
  return <div className="space-y-6"><PageHeader title="Chit Funds" description="Track household chit commitments and each month’s payment." actions={can('FINANCE_WRITE') ? <Button onClick={() => setAdding(!adding)}><Plus className="h-4 w-4" />Add chit fund</Button> : undefined} />
    {adding && <Card><CardContent className="p-5"><form onSubmit={submit} className="grid gap-3 md:grid-cols-3"><Input name="name" required placeholder="Fund name" /><Input name="organizer" placeholder="Organizer" /><Input name="totalAmount" required type="number" min="0.01" step="0.01" placeholder="Total amount" /><Input name="monthlyAmount" required type="number" min="0.01" step="0.01" placeholder="Monthly payment" /><Input name="totalMembers" required type="number" min="2" placeholder="Total members" /><Input name="dueDay" required type="number" min="1" max="31" placeholder="Due day" /><Input name="startDate" required type="date" /><Input name="endDate" required type="date" /><div className="flex gap-2"><Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button><Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button></div></form></CardContent></Card>}
    {funds.isPending ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : !funds.data?.length ? <Card><EmptyState icon={CircleDollarSign} title="No chit funds yet" description="Add a fund to track its monthly household payment." /></Card> : <div className="grid gap-4 md:grid-cols-2">{funds.data.map((fund) => <Card key={fund.id}><CardContent className="space-y-3 p-5"><div className="flex justify-between"><div><h2 className="font-semibold">{fund.name}</h2><p className="text-sm text-muted-foreground">{fund.organizer ?? 'No organizer'} · {fund.totalMembers} members</p></div>{can('FINANCE_DELETE') && <Button size="icon" variant="ghost" aria-label="Delete fund" onClick={() => remove.mutate(fund.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div><div className="grid grid-cols-2 gap-2 text-sm"><span className="text-muted-foreground">Total</span><span className="text-right font-medium">{format(Number(fund.totalAmount))}</span><span className="text-muted-foreground">Monthly</span><span className="text-right font-medium">{format(Number(fund.monthlyAmount))}</span><span className="text-muted-foreground">Paid months</span><span className="text-right font-medium">{fund.payments.filter((p) => p.status === 'PAID').length}</span></div>{can('FINANCE_WRITE') && <Button className="w-full" variant="outline" onClick={() => pay.mutate({ id: fund.id, amount: Number(fund.monthlyAmount) })}>Record this month’s payment</Button>}</CardContent></Card>)}</div>}
  </div>;
};
export default ChitFundPage;

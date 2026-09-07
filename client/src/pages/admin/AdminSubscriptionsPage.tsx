import { useState } from 'react';
import { useAdminSubscriptions } from '@/features/admin/admin.hooks';
import PageHeader from '@/components/common/PageHeader';
import BackButton from '@/components/common/BackButton';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { CreditCard } from 'lucide-react';

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  FAMILY: 'Family',
  ENTERPRISE: 'Enterprise',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'muted' | 'secondary'> = {
  TRIAL: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'muted',
  CANCELLED: 'destructive',
  EXPIRED: 'destructive',
};

const AdminSubscriptionsPage = () => {
  const [page, setPage] = useState(1);
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');

  const query = useAdminSubscriptions({
    page,
    plan: plan || undefined,
    status: status || undefined,
  });

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="View all family subscriptions." backButton={<BackButton to="/admin" />} />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}>
          <option value="">All Plans</option>
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
          <option value="FAMILY">Family</option>
          <option value="ENTERPRISE">Enterprise</option>
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="TRIAL">Trial</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {items.length === 0 && !query.isLoading && (
          <div className="p-10">
            <EmptyState
              icon={CreditCard}
              title="No subscriptions found"
              description="No subscriptions match the selected filters."
            />
          </div>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Family</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Renewal</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {items.map((sub) => (
                  <tr key={sub.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{sub.family.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{sub.family.code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{PLAN_LABELS[sub.plan] ?? sub.plan}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[sub.status] ?? 'secondary'}>{sub.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(sub.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {sub.renewalDate ? new Date(sub.renewalDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {sub.cancelledAt ? new Date(sub.cancelledAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.total > 0 && (
        <Pagination meta={meta} onPageChange={setPage} label="subscriptions" />
      )}
    </div>
  );
};

export default AdminSubscriptionsPage;

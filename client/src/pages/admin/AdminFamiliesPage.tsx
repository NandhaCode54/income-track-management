import { useState } from 'react';
import { useAdminFamilies } from '@/features/admin/admin.hooks';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Search, Home } from 'lucide-react';
import { ROLE_LABELS } from '@/constants/permissions';
import type { UserRole } from '@/types/auth.types';

const AdminFamiliesPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [plan, setPlan] = useState<string>('');

  const query = useAdminFamilies({
    page,
    search: search || undefined,
    plan: plan || undefined,
  });

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Family Management" description="View all family workspaces on the platform." />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}>
          <option value="">All Plans</option>
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
          <option value="FAMILY">Family</option>
          <option value="ENTERPRISE">Enterprise</option>
        </Select>
        <Button variant="outline" onClick={handleSearch}>
          Search
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {items.length === 0 && !query.isLoading && (
          <div className="p-10">
            <EmptyState
              icon={Home}
              title="No families found"
              description={search || plan ? 'Try a different filter.' : 'No families exist yet.'}
            />
          </div>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Family</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Members</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Income</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expenses</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((family) => (
                  <tr key={family.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{family.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {family.members.slice(0, 3).map((m) => `${m.user.firstName} (${ROLE_LABELS[m.role as UserRole] ?? m.role})`).join(', ')}
                          {family.members.length > 3 && ` +${family.members.length - 3}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{family.code}</td>
                    <td className="px-4 py-3">
                      <Badge variant={family.subscription?.plan === 'FREE' ? 'muted' : 'default'}>
                        {family.tenant.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{family._count.members}</td>
                    <td className="px-4 py-3 text-muted-foreground">{family._count.incomes}</td>
                    <td className="px-4 py-3 text-muted-foreground">{family._count.expenses}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(family.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.total > 0 && (
        <Pagination meta={meta} onPageChange={setPage} label="families" />
      )}
    </div>
  );
};

export default AdminFamiliesPage;

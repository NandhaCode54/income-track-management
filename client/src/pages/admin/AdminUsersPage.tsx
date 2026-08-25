import { useState } from 'react';
import { useAdminUsers, useSetUserStatus } from '@/features/admin/admin.hooks';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserCheck, UserX } from 'lucide-react';
import { ROLE_LABELS } from '@/constants/permissions';
import type { UserRole } from '@/types/auth.types';

const AdminUsersPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const query = useAdminUsers({ page, search: search || undefined });
  const toggleStatus = useSetUserStatus();

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="View and manage all platform users." />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          Search
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {items.length === 0 && !query.isLoading && (
          <div className="p-10">
            <EmptyState
              icon={UserX}
              title="No users found"
              description={search ? 'Try a different search term.' : 'No users have signed up yet.'}
            />
          </div>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role(s)</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        {user.families.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {user.families.map((f) => f.name).join(', ')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.families.map((f) => (
                          <Badge key={f.id} variant="secondary" className="text-[10px]">
                            {ROLE_LABELS[f.role as UserRole] ?? f.role}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? 'success' : 'destructive'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={toggleStatus.isPending}
                        onClick={() =>
                          toggleStatus.mutate({ id: user.id, isActive: !user.isActive })
                        }
                      >
                        {user.isActive ? (
                          <UserX className="h-4 w-4 text-destructive" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-emerald-500" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.total > 0 && (
        <Pagination meta={meta} onPageChange={setPage} label="users" />
      )}
    </div>
  );
};

export default AdminUsersPage;

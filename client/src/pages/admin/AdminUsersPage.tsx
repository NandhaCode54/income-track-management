import { useState } from 'react';
import { useAdminUsers, useSetUserStatus, useUpdateMemberRole } from '@/features/admin/admin.hooks';
import PageHeader from '@/components/common/PageHeader';
import BackButton from '@/components/common/BackButton';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, UserCheck, UserX, Pencil, Loader2 } from 'lucide-react';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/constants/permissions';
import type { UserRole } from '@/types/auth.types';
import type { AdminUser } from '@/types/admin.types';

const ALL_ROLES: UserRole[] = ['TENANT_OWNER', 'FAMILY_HEAD', 'MEMBER', 'VIEWER'];

const RoleEditDialog = ({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const updateRole = useUpdateMemberRole();

  const [edits, setEdits] = useState<Record<string, UserRole>>(() =>
    Object.fromEntries(user.families.map((f) => [f.id, f.role])),
  );

  const hasChanges = user.families.some((f) => edits[f.id] !== f.role);

  const handleSave = () => {
    const changes = user.families.filter((f) => edits[f.id] !== f.role);
    if (changes.length === 0) return;

    let pending = changes.length;
    changes.forEach((f) => {
      updateRole.mutate(
        { userId: user.id, familyId: f.id, role: edits[f.id] },
        {
          onSettled: () => {
            pending -= 1;
            if (pending === 0) onOpenChange(false);
          },
        },
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Roles</DialogTitle>
          <DialogDescription>
            Change {user.firstName}&apos;s role in their family workspaces.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {user.families.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              This user is not a member of any family.
            </p>
          ) : (
            user.families.map((f) => (
              <div key={f.id} className="space-y-1.5">
                <Label className="text-sm font-medium">{f.name}</Label>
                <Select
                  value={edits[f.id] ?? f.role}
                  onChange={(e) =>
                    setEdits((prev) => ({ ...prev, [f.id]: e.target.value as UserRole }))
                  }
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
                {edits[f.id] && edits[f.id] !== 'TENANT_OWNER' && (
                  <p className="text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[edits[f.id] as keyof typeof ROLE_DESCRIPTIONS] ?? ''}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || updateRole.isPending}>
            {updateRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AdminUsersPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

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
      <PageHeader title="User Management" description="View and manage all platform users." backButton={<BackButton to="/admin" />} />

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
                          <button
                            key={f.id}
                            onClick={() => setEditingUser(user)}
                            className="group inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Badge variant="secondary" className="text-[10px] group-hover:bg-primary/20 transition-colors">
                              {ROLE_LABELS[f.role as UserRole] ?? f.role}
                            </Badge>
                            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                        {user.families.length === 0 && (
                          <span className="text-xs text-muted-foreground">No family</span>
                        )}
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
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={toggleStatus.isPending}
                          onClick={() =>
                            toggleStatus.mutate({ id: user.id, isActive: !user.isActive })
                          }
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4 text-destructive" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-emerald-500" />
                          )}
                        </Button>
                      </div>
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

      {editingUser && (
        <RoleEditDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => {
            if (!open) setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminUsersPage;

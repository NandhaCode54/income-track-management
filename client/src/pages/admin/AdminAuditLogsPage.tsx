import { useState } from 'react';
import { useAdminAuditLogs } from '@/features/admin/admin.hooks';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { ScrollText } from 'lucide-react';

const ACTION_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'destructive',
  LOGIN: 'default',
  LOGOUT: 'secondary',
  INVITE_SENT: 'secondary',
  INVITE_ACCEPTED: 'success',
  ROLE_CHANGED: 'warning',
  PASSWORD_CHANGED: 'warning',
};

const AdminAuditLogsPage = () => {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');

  const query = useAdminAuditLogs({
    page,
    action: action || undefined,
    entity: entity || undefined,
  });

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Platform-wide activity trail." />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
          <option value="INVITE_SENT">Invite Sent</option>
          <option value="INVITE_ACCEPTED">Invite Accepted</option>
          <option value="ROLE_CHANGED">Role Changed</option>
          <option value="PASSWORD_CHANGED">Password Changed</option>
        </Select>
        <Select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
          <option value="">All Entities</option>
          <option value="User">User</option>
          <option value="Family">Family</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
          <option value="Budget">Budget</option>
          <option value="EMI">EMI</option>
          <option value="Bill">Bill</option>
          <option value="Rent">Rent</option>
          <option value="Goal">Goal</option>
          <option value="Investment">Investment</option>
          <option value="Announcement">Announcement</option>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {items.length === 0 && !query.isLoading && (
          <div className="p-10">
            <EmptyState
              icon={ScrollText}
              title="No audit logs found"
              description="No entries match the selected filters."
            />
          </div>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Family</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP</th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <tr key={log.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ACTION_VARIANT[log.action] ?? 'secondary'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{log.entity}</span>
                      {log.entityId && (
                        <span className="ml-1 text-xs text-muted-foreground font-mono">
                          {log.entityId.slice(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.family ? log.family.name : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {log.ip ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.total > 0 && (
        <Pagination meta={meta} onPageChange={setPage} label="audit log entries" />
      )}
    </div>
  );
};

export default AdminAuditLogsPage;

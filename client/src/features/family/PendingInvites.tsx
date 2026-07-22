import { useState } from 'react';
import { MailPlus, RefreshCw, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import RoleBadge from './RoleBadge';
import { useResendInvite, useRevokeInvite } from './family.hooks';
import type { Invite } from '@/types/family.types';

const PendingInvites = ({ invites }: { invites: Invite[] }) => {
  const resend = useResendInvite();
  const revoke = useRevokeInvite();
  const [pendingRevoke, setPendingRevoke] = useState<Invite | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Pending invitations</CardTitle>
        <CardDescription>
          People who have been invited but haven&apos;t joined yet.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {invites.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            <MailPlus className="h-5 w-5 shrink-0" />
            No pending invitations.
          </div>
        ) : (
          <ul className="divide-y">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited{' '}
                    {invite.invitedBy
                      ? `by ${invite.invitedBy.firstName} ${invite.invitedBy.lastName} `
                      : ''}
                    on {new Date(invite.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <RoleBadge role={invite.role} />
                  {invite.isExpired ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : (
                    <Badge variant="warning">Pending</Badge>
                  )}

                  <button
                    type="button"
                    onClick={() => resend.mutate(invite.id)}
                    disabled={resend.isPending}
                    aria-label={`Resend invitation to ${invite.email}`}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingRevoke(invite)}
                    aria-label={`Revoke invitation to ${invite.email}`}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!pendingRevoke}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
        title="Revoke invitation?"
        description={
          pendingRevoke
            ? `The link sent to ${pendingRevoke.email} will stop working immediately.`
            : undefined
        }
        confirmLabel="Revoke"
        destructive
        loading={revoke.isPending}
        onConfirm={() =>
          pendingRevoke &&
          revoke.mutate(pendingRevoke.id, { onSuccess: () => setPendingRevoke(null) })
        }
      />
    </Card>
  );
};

export default PendingInvites;

import { AlertCircle, Loader2, Users } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePermission } from '@/hooks/usePermission';
import { getApiErrorMessage } from '@/lib/api-error';
import FamilyProfileCard from '@/features/family/FamilyProfileCard';
import InviteMemberDialog from '@/features/family/InviteMemberDialog';
import MembersTable from '@/features/family/MembersTable';
import PendingInvites from '@/features/family/PendingInvites';
import { useFamily, useFamilyInvites, useFamilyMembers } from '@/features/family/family.hooks';

const FamilyPage = () => {
  const { can } = usePermission();
  const familyQuery = useFamily();
  const membersQuery = useFamilyMembers();
  const invitesQuery = useFamilyInvites();

  if (familyQuery.isLoading || membersQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (familyQuery.isError || !familyQuery.data) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load your family"
        description={getApiErrorMessage(familyQuery.error)}
      />
    );
  }

  const members = membersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Family"
        description="Manage your workspace, its members and their permissions."
        actions={can('MEMBER_INVITE') ? <InviteMemberDialog /> : undefined}
      />

      <FamilyProfileCard family={familyQuery.data} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Members</CardTitle>
          <CardDescription>
            Roles decide what each person can see and change across the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {members.length === 0 ? (
            <EmptyState icon={Users} title="No members yet" />
          ) : (
            <MembersTable members={members} />
          )}
        </CardContent>
      </Card>

      {can('MEMBER_INVITE') && <PendingInvites invites={invitesQuery.data ?? []} />}
    </div>
  );
};

export default FamilyPage;

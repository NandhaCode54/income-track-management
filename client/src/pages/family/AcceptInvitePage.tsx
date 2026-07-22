import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Loader2, MailX, Users } from 'lucide-react';
import { familyApi } from '@/services/family.service';
import { authApi } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { QK } from '@/constants/queryKeys';
import { ROUTES } from '@/constants/routes';
import { ROLE_LABELS } from '@/constants/permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

/** Centered shell shared by every state of this page. */
const InviteShell = ({
  icon: Icon,
  tone = 'primary',
  title,
  children,
}: {
  icon: typeof Users;
  tone?: 'primary' | 'destructive' | 'success';
  title: string;
  children?: React.ReactNode;
}) => {
  const toneClasses = {
    primary: 'bg-primary/10 text-primary',
    destructive: 'bg-destructive/10 text-destructive',
    success: 'bg-emerald-500/10 text-emerald-500',
  }[tone];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 p-8 text-center">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${toneClasses}`}
          >
            <Icon className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {children}
        </CardContent>
      </Card>
    </div>
  );
};

const AcceptInvitePage = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setMember, setUser } = useAuthStore();

  const previewQuery = useQuery({
    queryKey: QK.INVITE_PREVIEW(token),
    queryFn: () => familyApi.previewInvite(token),
    retry: false,
    enabled: !!token,
  });

  const accept = useMutation({
    mutationFn: () => familyApi.acceptInvite(token),
    onSuccess: async (result) => {
      // The active workspace changed server-side — drop every cached, family-scoped query.
      queryClient.removeQueries();
      const profile = await queryClient.fetchQuery({ queryKey: QK.ME, queryFn: authApi.me });
      setUser(profile.user);
      if (profile.member) setMember(profile.member);
      toast.success('Welcome aboard!', `You joined ${result.familyName}.`);
      navigate(ROUTES.DASHBOARD, { replace: true });
    },
    onError: (error) => toast.error('Could not accept invitation', getApiErrorMessage(error)),
  });

  if (previewQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (previewQuery.isError || !previewQuery.data) {
    return (
      <InviteShell icon={MailX} tone="destructive" title="Invitation not found">
        <p className="text-sm text-muted-foreground">
          {getApiErrorMessage(previewQuery.error, 'This invitation link is no longer valid.')}
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link to={ROUTES.LOGIN}>Go to sign in</Link>
        </Button>
      </InviteShell>
    );
  }

  const invite = previewQuery.data;

  if (invite.isAccepted) {
    return (
      <InviteShell icon={CheckCircle2} tone="success" title="Already accepted">
        <p className="text-sm text-muted-foreground">
          This invitation to <strong>{invite.familyName}</strong> has already been used.
        </p>
        <Button asChild className="w-full">
          <Link to={ROUTES.DASHBOARD}>Go to dashboard</Link>
        </Button>
      </InviteShell>
    );
  }

  if (invite.isExpired) {
    return (
      <InviteShell icon={AlertCircle} tone="destructive" title="Invitation expired">
        <p className="text-sm text-muted-foreground">
          Ask someone in <strong>{invite.familyName}</strong> to send you a new invitation.
        </p>
      </InviteShell>
    );
  }

  const inviteDetails = (
    <p className="text-sm text-muted-foreground">
      You&apos;ve been invited to join <strong>{invite.familyName}</strong> as{' '}
      <strong>{ROLE_LABELS[invite.role]}</strong>.
    </p>
  );

  // Not signed in — send them through auth and come straight back here afterwards.
  if (!isAuthenticated) {
    const redirect = `?redirect=${encodeURIComponent(`/join/${token}`)}`;
    return (
      <InviteShell icon={Users} title={`Join ${invite.familyName}`}>
        {inviteDetails}
        <p className="text-sm text-muted-foreground">
          Sign in as <strong>{invite.email}</strong> to accept — or create an account with that
          address first.
        </p>
        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link to={`${ROUTES.LOGIN}${redirect}`}>Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to={`${ROUTES.REGISTER}${redirect}`}>Create an account</Link>
          </Button>
        </div>
      </InviteShell>
    );
  }

  // Signed in with the wrong account — the server enforces this too.
  if (user && user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <InviteShell icon={AlertCircle} tone="destructive" title="Wrong account">
        <p className="text-sm text-muted-foreground">
          This invitation was sent to <strong>{invite.email}</strong>, but you&apos;re signed in as{' '}
          <strong>{user.email}</strong>.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            useAuthStore.getState().logout();
            navigate(`${ROUTES.LOGIN}?redirect=${encodeURIComponent(`/join/${token}`)}`);
          }}
        >
          Sign in with a different account
        </Button>
      </InviteShell>
    );
  }

  return (
    <InviteShell icon={Users} title={`Join ${invite.familyName}`}>
      {inviteDetails}
      <div className="space-y-2">
        <Button className="w-full" onClick={() => accept.mutate()} disabled={accept.isPending}>
          {accept.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Accept invitation
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to={ROUTES.DASHBOARD}>Not now</Link>
        </Button>
      </div>
    </InviteShell>
  );
};

export default AcceptInvitePage;

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { usePermission } from '@/hooks/usePermission';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/constants/permissions';
import { inviteMemberSchema, type InviteMemberForm } from './family.schemas';
import { useInviteMember } from './family.hooks';

const InviteMemberDialog = () => {
  const [open, setOpen] = useState(false);
  const { assignableRoles } = usePermission();
  const invite = useInviteMember();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteMemberForm>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'MEMBER' },
  });

  const selectedRole = watch('role');

  const onSubmit = (values: InviteMemberForm) =>
    invite.mutate(values, {
      onSuccess: () => {
        reset({ email: '', role: 'MEMBER' });
        setOpen(false);
      },
    });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Invite member
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              We&apos;ll email them a link to join this workspace. It expires in 48 hours.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="them@example.com"
                autoComplete="off"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteRole">Role</Label>
              <Select id="inviteRole" aria-invalid={!!errors.role} {...register('role')}>
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
              <p className="text-sm text-muted-foreground">
                {ROLE_DESCRIPTIONS[selectedRole]}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InviteMemberDialog;

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Loader2, Pencil, Users, MailPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { usePermission } from '@/hooks/usePermission';
import { renameFamilySchema, type RenameFamilyForm } from './family.schemas';
import { useRenameFamily } from './family.hooks';
import type { Family } from '@/types/family.types';

const FamilyProfileCard = ({ family }: { family: Family }) => {
  const { can } = usePermission();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const rename = useRenameFamily();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RenameFamilyForm>({
    resolver: zodResolver(renameFamilySchema),
    values: { name: family.name },
  });

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(family.code);
      setCopied(true);
    } catch {
      toast.error('Could not copy', 'Your browser blocked clipboard access.');
    }
  };

  const onSubmit = (values: RenameFamilyForm) =>
    rename.mutate(values, { onSuccess: () => setIsEditing(false) });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-xl">Workspace</CardTitle>
          <CardDescription>
            Everything your family tracks lives inside this workspace.
          </CardDescription>
        </div>
        {can('FAMILY_MANAGE') && !isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
            Rename
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <div className="space-y-2">
              <Label htmlFor="familyName">Family name</Label>
              <Input id="familyName" aria-invalid={!!errors.name} {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={rename.isPending}>
                {rename.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  reset({ name: family.name });
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-2xl font-semibold tracking-tight">{family.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {new Date(family.createdAt).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Members
            </div>
            <p className="mt-2 text-2xl font-semibold">{family.memberCount}</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MailPlus className="h-4 w-4" />
              Pending invites
            </div>
            <p className="mt-2 text-2xl font-semibold">{family.pendingInviteCount}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Family code</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 font-mono text-sm">{family.code}</code>
              <button
                type="button"
                onClick={copyCode}
                aria-label="Copy family code"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FamilyProfileCard;

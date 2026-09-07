import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import BackButton from '@/components/common/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PasswordInput } from '@/components/ui/password-input';
import Skeleton from '@/components/common/Skeleton';
import { useSettings, useUpdateSettings } from '@/features/settings/settings.hooks';
import { useSubscription } from '@/features/subscription/subscription.hooks';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/services/auth.service';
import { QK } from '@/constants/queryKeys';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
  LANGUAGE_OPTIONS,
  DATE_FORMAT_OPTIONS,
} from '@/features/settings/settings.types';
import { PLAN_LABELS, STATUS_LABELS, STATUS_VARIANTS } from '@/types/subscription.types';
import { cn } from '@/lib/utils';
import {
  Settings,
  User,
  Shield,
  CreditCard,
  Globe,
  Save,
  Loader2,
} from 'lucide-react';

type Tab = 'preferences' | 'profile' | 'security' | 'subscription';

const tabs: { key: Tab; label: string; icon: typeof Settings }[] = [
  { key: 'preferences', label: 'Preferences', icon: Globe },
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'subscription', label: 'Subscription', icon: CreditCard },
];

// ── Preferences Tab ──────────────────────────────────────────────────────────

const PreferencesTab = () => {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  const [dirty, setDirty] = useState(false);

  const set = (key: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const get = (key: string, fallback: unknown) =>
    key in form ? form[key] : fallback;

  const handleSave = () => {
    updateSettings.mutate(form, {
      onSuccess: () => {
        setForm({});
        setDirty(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Regional</h3>
        <p className="text-sm text-muted-foreground">Set your currency, timezone and display preferences.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            id="currency"
            value={String(get('currency', settings.currency))}
            onChange={(e) => {
              const opt = CURRENCY_OPTIONS.find((c) => c.code === e.target.value);
              set('currency', e.target.value);
              if (opt) set('currencySymbol', opt.symbol);
            }}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} ({c.symbol})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            id="timezone"
            value={String(get('timezone', settings.timezone))}
            onChange={(e) => set('timezone', e.target.value)}
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            id="language"
            value={String(get('language', settings.language))}
            onChange={(e) => set('language', e.target.value)}
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFormat">Date Format</Label>
          <Select
            id="dateFormat"
            value={String(get('dateFormat', settings.dateFormat))}
            onChange={(e) => set('dateFormat', e.target.value)}
          >
            {DATE_FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fyStart">Financial Year Start Month</Label>
          <Select
            id="fyStart"
            value={String(get('financialYearStart', settings.financialYearStart))}
            onChange={(e) => set('financialYearStart', Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('en', { month: 'long' })}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reminderDays">Reminders (days before)</Label>
          <Input
            id="reminderDays"
            type="number"
            min={0}
            max={30}
            value={String(get('reminderDaysBefore', settings.reminderDaysBefore))}
            onChange={(e) => set('reminderDaysBefore', Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">Choose how you want to be reminded.</p>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(get('emailReminders', settings.emailReminders))}
            onChange={(e) => set('emailReminders', e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <div>
            <p className="text-sm font-medium">Email reminders</p>
            <p className="text-xs text-muted-foreground">Receive bill and goal reminders via email</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(get('pushReminders', settings.pushReminders))}
            onChange={(e) => set('pushReminders', e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <div>
            <p className="text-sm font-medium">Push reminders</p>
            <p className="text-xs text-muted-foreground">Receive in-app push notifications</p>
          </div>
        </label>
      </div>

      {dirty && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Profile Tab ──────────────────────────────────────────────────────────────

const ProfileTab = () => {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const hasChanges = firstName !== (user?.firstName ?? '') || lastName !== (user?.lastName ?? '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const { user: updated } = await authApi.updateProfile({
        firstName,
        lastName,
        phone: phone || undefined,
      });
      setUser({ ...user!, firstName: updated.firstName, lastName: updated.lastName });
      queryClient.invalidateQueries({ queryKey: QK.ME });
      toast.success('Profile updated');
    } catch (e) {
      toast.error('Could not update profile', getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Personal Information</h3>
        <p className="text-sm text-muted-foreground">Update your name and contact details.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ''} disabled />
          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Security Tab ─────────────────────────────────────────────────────────────

const SecurityTab = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  const handleChange = async () => {
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (e) {
      toast.error('Could not change password', getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Change Password</h3>
        <p className="text-sm text-muted-foreground">Ensure your account stays secure with a strong password.</p>
      </div>

      <div className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPw">Current Password</Label>
          <PasswordInput
            id="currentPw"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPw">New Password</Label>
          <PasswordInput
            id="newPw"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPw">Confirm New Password</Label>
          <PasswordInput
            id="confirmPw"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleChange} disabled={!canSubmit || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Change Password
        </Button>
      </div>
    </div>
  );
};

// ── Subscription Tab ─────────────────────────────────────────────────────────

const SubscriptionTab = () => {
  const { data: subscription, isLoading } = useSubscription();

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Current Plan</h3>
        <p className="text-sm text-muted-foreground">View and manage your subscription plan.</p>
      </div>

      {subscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{PLAN_LABELS[subscription.plan]} Plan</CardTitle>
              <Badge variant={STATUS_VARIANTS[subscription.status]}>
                {STATUS_LABELS[subscription.status]}
              </Badge>
            </div>
            <CardDescription>
              {subscription.planDetails.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium">
                  {new Date(subscription.startDate).toLocaleDateString()}
                </p>
              </div>
              {subscription.renewalDate && (
                <div>
                  <p className="text-muted-foreground">Next renewal</p>
                  <p className="font-medium">
                    {new Date(subscription.renewalDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {subscription.cancelledAt && (
                <div>
                  <p className="text-muted-foreground">Cancelled</p>
                  <p className="font-medium">
                    {new Date(subscription.cancelledAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {subscription.trialEndsAt && (
                <div>
                  <p className="text-muted-foreground">Trial ends</p>
                  <p className="font-medium">
                    {new Date(subscription.trialEndsAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {subscription.plan !== 'FREE' && (
              <div>
                <p className="text-sm font-medium mb-2">Included features</p>
                <div className="flex flex-wrap gap-2">
                  {subscription.planDetails.features
                    .filter((f) => f.included)
                    .map((f) => (
                      <Badge key={f.label} variant="secondary">
                        {f.label}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No active subscription. You are on the Free plan.
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button asChild variant="outline">
          <a href="/settings">Manage Subscription</a>
        </Button>
      </div>
    </div>
  );
};

// ── Main Settings Page ───────────────────────────────────────────────────────

const tabContent: Record<Tab, React.ComponentType> = {
  preferences: PreferencesTab,
  profile: ProfileTab,
  security: SecurityTab,
  subscription: SubscriptionTab,
};

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('preferences');
  const ActiveContent = tabContent[activeTab];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and family workspace settings."
        backButton={<BackButton />}
      />

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Tab sidebar */}
        <nav className="flex md:flex-col gap-1 md:w-48 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-6">
              <ActiveContent />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

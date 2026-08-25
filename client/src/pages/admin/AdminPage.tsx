import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Home, CreditCard, ScrollText, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';

const adminSections = [
  { label: 'Dashboard', description: 'Platform analytics and overview', icon: BarChart3, to: ROUTES.ADMIN },
  { label: 'Users', description: 'Manage all platform users', icon: Users, to: ROUTES.ADMIN_USERS },
  { label: 'Families', description: 'View all family workspaces', icon: Home, to: ROUTES.ADMIN_FAMILIES },
  { label: 'Subscriptions', description: 'Subscription management', icon: CreditCard, to: ROUTES.ADMIN_SUBSCRIPTIONS },
  { label: 'Audit Logs', description: 'Platform activity trail', icon: ScrollText, to: ROUTES.ADMIN_AUDIT_LOGS },
];

const AdminPage = () => (
  <div className="space-y-6">
    <PageHeader
      title="Admin Panel"
      description="Manage the platform, users, and families."
    />

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {adminSections.map((section) => (
        <NavLink key={section.to} to={section.to}>
          {({ isActive }) => (
            <Card
              className={cn(
                'transition-colors hover:border-primary/50 hover:bg-accent/50',
                isActive && 'border-primary bg-primary/5',
              )}
            >
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{section.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </CardContent>
            </Card>
          )}
        </NavLink>
      ))}
    </div>
  </div>
);

export default AdminPage;

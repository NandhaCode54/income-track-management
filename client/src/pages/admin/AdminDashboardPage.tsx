import { useAdminAnalytics } from '@/features/admin/admin.hooks';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Home, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  FAMILY: 'Family',
  ENTERPRISE: 'Enterprise',
};

const AdminDashboardPage = () => {
  const { data: analytics, isLoading } = useAdminAnalytics();

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin Dashboard" description="Platform-wide overview." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Platform-wide overview." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={analytics.totalUsers.toLocaleString()}
          subtitle={`${analytics.activeUsers} active`}
          icon={Users}
        />
        <StatCard
          title="Families"
          value={analytics.totalFamilies.toLocaleString()}
          subtitle={`${analytics.activeFamilies} active`}
          icon={Home}
        />
        <StatCard
          title="Subscriptions"
          value={analytics.totalSubscriptions.toLocaleString()}
          icon={CreditCard}
        />
        <StatCard
          title="Total Income"
          value={formatCurrency(analytics.totalIncome)}
          icon={TrendingUp}
          variant="income"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plan Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.planBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
            ) : (
              <div className="space-y-3">
                {analytics.planBreakdown.map((item) => (
                  <div key={item.plan} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{PLAN_LABELS[item.plan] ?? item.plan}</span>
                    <span className="text-sm text-muted-foreground">{item.count} families</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Signups (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.recentSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No signups in the last 30 days.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analytics.recentSignups.map((item) => (
                  <div key={item.date} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                    <span className="font-medium">{item.count} user{item.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Platform Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{formatCurrency(analytics.totalIncome)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Platform Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(analytics.totalExpenses)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

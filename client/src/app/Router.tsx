import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/constants/routes';
import { safeRedirect } from '@/lib/redirect';
import AppLayout from '@/components/layout/AppLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'));

// App pages
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const IncomePage = lazy(() => import('@/pages/income/IncomePage'));
const ExpensesPage = lazy(() => import('@/pages/expenses/ExpensesPage'));
const BudgetPage = lazy(() => import('@/pages/budget/BudgetPage'));
const GoalsPage = lazy(() => import('@/pages/goals/GoalsPage'));
const EMIPage = lazy(() => import('@/pages/emi/EMIPage'));
const BillsPage = lazy(() => import('@/pages/bills/BillsPage'));
const RentPage = lazy(() => import('@/pages/rent/RentPage'));
const SchoolFeesPage = lazy(() => import('@/pages/school-fees/SchoolFeesPage'));
const ChitFundPage = lazy(() => import('@/pages/chit-fund/ChitFundPage'));
const InvestmentsPage = lazy(() => import('@/pages/investments/InvestmentsPage'));
const AssetsPage = lazy(() => import('@/pages/assets/AssetsPage'));
const LiabilitiesPage = lazy(() => import('@/pages/liabilities/LiabilitiesPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'));
const FamilyPage = lazy(() => import('@/pages/family/FamilyPage'));
const AcceptInvitePage = lazy(() => import('@/pages/family/AcceptInvitePage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const SubscriptionPage = lazy(() => import('@/pages/subscription/SubscriptionPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

// Admin pages
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminFamiliesPage = lazy(() => import('@/pages/admin/AdminFamiliesPage'));
const AdminSubscriptionsPage = lazy(() => import('@/pages/admin/AdminSubscriptionsPage'));
const AdminAuditLogsPage = lazy(() => import('@/pages/admin/AdminAuditLogsPage'));
const AdminAnnouncementsPage = lazy(() => import('@/pages/admin/AdminAnnouncementsPage'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  return <>{children}</>;
};

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [params] = useSearchParams();
  if (isAuthenticated) {
    return <Navigate to={safeRedirect(params.get('redirect'), ROUTES.DASHBOARD)} replace />;
  }
  return <>{children}</>;
};

const wrap = (el: React.ReactNode) => <Suspense fallback={<LoadingScreen />}>{el}</Suspense>;

const router = createBrowserRouter([
  {
    element: (
      <GuestRoute>
        <AuthLayout />
      </GuestRoute>
    ),
    errorElement: <ErrorBoundary><LoadingScreen /></ErrorBoundary>,
    children: [
      { path: ROUTES.LOGIN, element: wrap(<LoginPage />) },
      { path: ROUTES.REGISTER, element: wrap(<RegisterPage />) },
      { path: ROUTES.FORGOT_PASSWORD, element: wrap(<ForgotPasswordPage />) },
      { path: ROUTES.RESET_PASSWORD, element: wrap(<ResetPasswordPage />) },
      { path: ROUTES.VERIFY_EMAIL, element: wrap(<VerifyEmailPage />) },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary><LoadingScreen /></ErrorBoundary>,
    children: [
      { path: ROUTES.DASHBOARD, element: wrap(<DashboardPage />) },
      { path: ROUTES.INCOME, element: wrap(<IncomePage />) },
      { path: ROUTES.EXPENSES, element: wrap(<ExpensesPage />) },
      { path: ROUTES.BUDGET, element: wrap(<BudgetPage />) },
      { path: ROUTES.GOALS, element: wrap(<GoalsPage />) },
      { path: ROUTES.EMI, element: wrap(<EMIPage />) },
      { path: ROUTES.BILLS, element: wrap(<BillsPage />) },
      { path: ROUTES.RENT, element: wrap(<RentPage />) },
      { path: ROUTES.SCHOOL_FEES, element: wrap(<SchoolFeesPage />) },
      { path: ROUTES.CHIT_FUND, element: wrap(<ChitFundPage />) },
      { path: ROUTES.INVESTMENTS, element: wrap(<InvestmentsPage />) },
      { path: ROUTES.ASSETS, element: wrap(<AssetsPage />) },
      { path: ROUTES.LIABILITIES, element: wrap(<LiabilitiesPage />) },
      { path: ROUTES.REPORTS, element: wrap(<ReportsPage />) },
      { path: ROUTES.NOTIFICATIONS, element: wrap(<NotificationsPage />) },
      { path: ROUTES.FAMILY, element: wrap(<FamilyPage />) },
      { path: ROUTES.SETTINGS, element: wrap(<SettingsPage />) },
      { path: ROUTES.SUBSCRIPTION, element: wrap(<SubscriptionPage />) },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <AdminGuard>
          <AppLayout />
        </AdminGuard>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary><LoadingScreen /></ErrorBoundary>,
    children: [
      { path: ROUTES.ADMIN, element: wrap(<AdminPage />) },
      { path: '/admin/dashboard', element: wrap(<AdminDashboardPage />) },
      { path: ROUTES.ADMIN_USERS, element: wrap(<AdminUsersPage />) },
      { path: ROUTES.ADMIN_FAMILIES, element: wrap(<AdminFamiliesPage />) },
      { path: ROUTES.ADMIN_SUBSCRIPTIONS, element: wrap(<AdminSubscriptionsPage />) },
      { path: ROUTES.ADMIN_AUDIT_LOGS, element: wrap(<AdminAuditLogsPage />) },
      { path: '/admin/announcements', element: wrap(<AdminAnnouncementsPage />) },
    ],
  },
  { path: ROUTES.JOIN_FAMILY, element: wrap(<AcceptInvitePage />) },
  { path: '*', element: wrap(<NotFoundPage />) },
]);

export const AppRouter = () => <RouterProvider router={router} />;

import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import AdminLayout from '@/components/admin/AdminLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { safeRedirect } from '@/lib/redirect';

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'));

// Admin pages
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminFamiliesPage = lazy(() => import('@/pages/admin/AdminFamiliesPage'));
const AdminSubscriptionsPage = lazy(() => import('@/pages/admin/AdminSubscriptionsPage'));
const AdminAuditLogsPage = lazy(() => import('@/pages/admin/AdminAuditLogsPage'));
const AdminAnnouncementsPage = lazy(() => import('@/pages/admin/AdminAnnouncementsPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [params] = useSearchParams();
  if (isAuthenticated) {
    return <Navigate to={safeRedirect(params.get('redirect'), '/admin')} replace />;
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
      { path: '/login', element: wrap(<LoginPage />) },
      { path: '/register', element: wrap(<RegisterPage />) },
      { path: '/forgot-password', element: wrap(<ForgotPasswordPage />) },
      { path: '/reset-password', element: wrap(<ResetPasswordPage />) },
      { path: '/verify-email', element: wrap(<VerifyEmailPage />) },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <AdminGuard>
          <AdminLayout />
        </AdminGuard>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary><LoadingScreen /></ErrorBoundary>,
    children: [
      { path: '/', element: wrap(<AdminPage />) },
      { path: '/admin', element: wrap(<AdminPage />) },
      { path: '/admin/dashboard', element: wrap(<AdminDashboardPage />) },
      { path: '/admin/users', element: wrap(<AdminUsersPage />) },
      { path: '/admin/families', element: wrap(<AdminFamiliesPage />) },
      { path: '/admin/subscriptions', element: wrap(<AdminSubscriptionsPage />) },
      { path: '/admin/audit-logs', element: wrap(<AdminAuditLogsPage />) },
      { path: '/admin/announcements', element: wrap(<AdminAnnouncementsPage />) },
    ],
  },
  { path: '*', element: wrap(<NotFoundPage />) },
]);

export const AdminRouter = () => <RouterProvider router={router} />;

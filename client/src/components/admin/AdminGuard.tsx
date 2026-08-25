import { Navigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { ROUTES } from '@/constants/routes';
import LoadingScreen from '@/components/common/LoadingScreen';

interface AdminGuardProps {
  children: React.ReactNode;
}

const AdminGuard = ({ children }: AdminGuardProps) => {
  const { can, role } = usePermission();

  if (!role) return <LoadingScreen />;

  if (!can('ADMIN_ACCESS')) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;

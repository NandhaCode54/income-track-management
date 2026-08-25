import { ThemeProvider } from '../app/providers/ThemeProvider';
import { QueryProvider } from '../app/providers/QueryProvider';
import { AuthProvider } from '../app/providers/AuthProvider';
import { AdminRouter } from './AdminRouter';
import { Toaster } from '@/components/ui/toast';

const AdminApp = () => (
  <ThemeProvider>
    <QueryProvider>
      <AuthProvider>
        <AdminRouter />
        <Toaster />
      </AuthProvider>
    </QueryProvider>
  </ThemeProvider>
);

export default AdminApp;

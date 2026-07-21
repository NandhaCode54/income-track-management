import { ThemeProvider } from './providers/ThemeProvider';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';
import { AppRouter } from './Router';
import { Toaster } from '@/components/ui/toast';

const App = () => (
  <ThemeProvider>
    <QueryProvider>
      <AuthProvider>
        <AppRouter />
        <Toaster />
      </AuthProvider>
    </QueryProvider>
  </ThemeProvider>
);

export default App;

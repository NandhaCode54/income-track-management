import { Menu, Bell, Moon, Sun, LogOut } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/app/providers/ThemeProvider';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

const Topbar = () => {
  const { toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => null);
    logout();
    navigate(ROUTES.LOGIN);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4">
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-2 hover:bg-accent transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <button
          onClick={() => navigate(ROUTES.NOTIFICATIONS)}
          className="rounded-lg p-2 hover:bg-accent transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg p-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default Topbar;

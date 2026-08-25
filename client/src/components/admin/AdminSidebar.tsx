import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Home, CreditCard, ScrollText,
  Megaphone, Shield, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin/dashboard' },
  { label: 'Users', icon: Users, to: '/admin/users' },
  { label: 'Families', icon: Home, to: '/admin/families' },
  { label: 'Subscriptions', icon: CreditCard, to: '/admin/subscriptions' },
  { label: 'Audit Logs', icon: ScrollText, to: '/admin/audit-logs' },
  { label: 'Announcements', icon: Megaphone, to: '/admin/announcements' },
];

interface NavItemDef { label: string; icon: React.ElementType; to: string }
const NavItem = ({ item }: { item: NavItemDef }) => (
  <NavLink
    to={item.to}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )
    }
  >
    <item.icon className="h-4 w-4 shrink-0" />
    {item.label}
  </NavLink>
);

const AdminSidebar = () => {
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-sidebar-foreground">Admin Panel</p>
          <p className="text-xs text-sidebar-foreground/50">Family Finance</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;

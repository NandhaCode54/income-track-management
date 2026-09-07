import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import { usePermission } from '@/hooks/usePermission';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard, TrendingUp, CreditCard, PiggyBank, Target,
  Calendar, Receipt, Home, GraduationCap, Coins, BarChart3,
  Bell, Users, Settings, TrendingDown, Briefcase, Landmark,
  Shield, Crown, Search, X,
} from 'lucide-react';

interface NavItemDef {
  label: string;
  icon: React.ElementType;
  to: string;
  category: string;
}

const navItems: NavItemDef[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: ROUTES.DASHBOARD, category: 'Finance' },
  { label: 'Income', icon: TrendingUp, to: ROUTES.INCOME, category: 'Finance' },
  { label: 'Expenses', icon: CreditCard, to: ROUTES.EXPENSES, category: 'Finance' },
  { label: 'Budget', icon: PiggyBank, to: ROUTES.BUDGET, category: 'Finance' },
  { label: 'Goals', icon: Target, to: ROUTES.GOALS, category: 'Finance' },
  { label: 'EMI', icon: Calendar, to: ROUTES.EMI, category: 'Finance' },
  { label: 'Bills', icon: Receipt, to: ROUTES.BILLS, category: 'Payments' },
  { label: 'Rent', icon: Home, to: ROUTES.RENT, category: 'Payments' },
  { label: 'School Fees', icon: GraduationCap, to: ROUTES.SCHOOL_FEES, category: 'Payments' },
  { label: 'Chit Fund', icon: Coins, to: ROUTES.CHIT_FUND, category: 'Investments' },
  { label: 'Investments', icon: TrendingDown, to: ROUTES.INVESTMENTS, category: 'Investments' },
  { label: 'Assets', icon: Briefcase, to: ROUTES.ASSETS, category: 'Investments' },
  { label: 'Liabilities', icon: Landmark, to: ROUTES.LIABILITIES, category: 'Investments' },
  { label: 'Reports', icon: BarChart3, to: ROUTES.REPORTS, category: 'Insights' },
];

const bottomItems: NavItemDef[] = [
  { label: 'Notifications', icon: Bell, to: ROUTES.NOTIFICATIONS, category: 'Account' },
  { label: 'Family', icon: Users, to: ROUTES.FAMILY, category: 'Account' },
  { label: 'Subscription', icon: Crown, to: ROUTES.SUBSCRIPTION, category: 'Account' },
  { label: 'Settings', icon: Settings, to: ROUTES.SETTINGS, category: 'Account' },
];

const adminItem: NavItemDef = { label: 'Admin Panel', icon: Shield, to: ROUTES.ADMIN, category: 'Admin' };

const NavItem = ({ item }: { item: NavItemDef }) => (
  <NavLink
    to={item.to}
    end={item.to === ROUTES.DASHBOARD}
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

const Sidebar = () => {
  const { can } = usePermission();
  const [query, setQuery] = useState('');

  const allItems = useMemo(() => {
    const items = [...navItems, ...bottomItems];
    if (can('ADMIN_ACCESS')) items.push(adminItem);
    return items;
  }, [can]);

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [query, allItems]);

  const showNavItems = filtered === null ? navItems : [];
  const showBottomItems = filtered === null ? bottomItems : [];
  const showAdminItem = filtered === null && can('ADMIN_ACCESS');

  return (
    <aside data-sidebar className="flex h-full w-64 flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-white">FF</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-sidebar-foreground">Family Finance</p>
          <p className="text-xs text-sidebar-foreground/50">Manager</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules..."
            className="h-8 pl-8 pr-8 text-sm bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-sidebar-ring"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main nav / Search results */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filtered !== null ? (
          filtered.length > 0 ? (
            filtered.map((item) => <NavItem key={item.to} item={item} />)
          ) : (
            <p className="px-3 py-6 text-center text-xs text-sidebar-foreground/40">
              No modules found
            </p>
          )
        ) : (
          showNavItems.map((item) => <NavItem key={item.to} item={item} />)
        )}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        {filtered !== null
          ? null
          : showBottomItems.map((item) => <NavItem key={item.to} item={item} />)}
        {showAdminItem && <NavItem item={adminItem} />}
      </div>
    </aside>
  );
};

export default Sidebar;

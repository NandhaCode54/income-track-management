import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import {
  LayoutDashboard, TrendingUp, CreditCard, PiggyBank, Target,
  Calendar, Receipt, Home, GraduationCap, Coins, BarChart3,
  Bell, Users, Settings, TrendingDown, Briefcase, Landmark,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: ROUTES.DASHBOARD },
  { label: 'Income', icon: TrendingUp, to: ROUTES.INCOME },
  { label: 'Expenses', icon: CreditCard, to: ROUTES.EXPENSES },
  { label: 'Budget', icon: PiggyBank, to: ROUTES.BUDGET },
  { label: 'Goals', icon: Target, to: ROUTES.GOALS },
  { label: 'EMI', icon: Calendar, to: ROUTES.EMI },
  { label: 'Bills', icon: Receipt, to: ROUTES.BILLS },
  { label: 'Rent', icon: Home, to: ROUTES.RENT },
  { label: 'School Fees', icon: GraduationCap, to: ROUTES.SCHOOL_FEES },
  { label: 'Chit Fund', icon: Coins, to: ROUTES.CHIT_FUND },
  { label: 'Investments', icon: TrendingDown, to: ROUTES.INVESTMENTS },
  { label: 'Assets', icon: Briefcase, to: ROUTES.ASSETS },
  { label: 'Liabilities', icon: Landmark, to: ROUTES.LIABILITIES },
  { label: 'Reports', icon: BarChart3, to: ROUTES.REPORTS },
];

const bottomItems = [
  { label: 'Notifications', icon: Bell, to: ROUTES.NOTIFICATIONS },
  { label: 'Family', icon: Users, to: ROUTES.FAMILY },
  { label: 'Settings', icon: Settings, to: ROUTES.SETTINGS },
];

interface NavItemDef { label: string; icon: React.ElementType; to: string }
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

const Sidebar = () => (
  <aside className="flex h-full w-64 flex-col bg-sidebar">
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

    {/* Main nav */}
    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
      {navItems.map((item) => (
        <NavItem key={item.to} item={item} />
      ))}
    </nav>

    {/* Bottom nav */}
    <div className="border-t border-sidebar-border p-3 space-y-1">
      {bottomItems.map((item) => (
        <NavItem key={item.to} item={item} />
      ))}
    </div>
  </aside>
);

export default Sidebar;

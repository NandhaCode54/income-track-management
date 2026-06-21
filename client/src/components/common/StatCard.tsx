import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: 'default' | 'income' | 'expense' | 'savings';
  className?: string;
}

const variantStyles = {
  default: 'bg-card border-border',
  income: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900',
  expense: 'bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900',
  savings: 'bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  income: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
  expense: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
  savings: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
};

const StatCard = ({ title, value, subtitle, icon: Icon, trend, variant = 'default', className }: StatCardProps) => (
  <div className={cn('rounded-xl border p-5 shadow-sm', variantStyles[variant], className)}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        {trend && (
          <p className={cn('mt-2 text-xs font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </div>
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconStyles[variant])}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

export default StatCard;

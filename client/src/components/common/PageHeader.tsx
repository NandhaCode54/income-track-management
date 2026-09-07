import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  backButton?: ReactNode;
  className?: string;
}

const PageHeader = ({ title, description, actions, backButton, className }: PageHeaderProps) => (
  <div className={cn('flex items-start justify-between gap-4', className)}>
    <div className="flex items-start gap-2">
      {backButton}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;

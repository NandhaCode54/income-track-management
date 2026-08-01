import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TooltipRow {
  label: string;
  value: string;
  /** A CSS colour for the swatch. Omit for a row that carries no series colour. */
  color?: string;
  /** Renders the row above a hairline, for a derived total. */
  isTotal?: boolean;
}

interface ChartTooltipProps {
  title: string;
  rows: TooltipRow[];
  footer?: ReactNode;
}

/**
 * The hover panel every chart on the page shares.
 *
 * Identity comes from the swatch beside the label, never from colouring the text —
 * a light hue is illegible as type. And the tooltip only ever *enhances*: every
 * value it shows is also in the card's table view, so nothing is gated behind hover.
 */
const ChartTooltip = ({ title, rows, footer }: ChartTooltipProps) => (
  <div className="min-w-[11rem] rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
    <p className="text-xs font-medium text-muted-foreground">{title}</p>

    <dl className="mt-2 space-y-1.5">
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            'flex items-baseline justify-between gap-4 text-sm',
            row.isTotal && 'mt-1.5 border-t pt-1.5',
          )}
        >
          <dt className="flex items-center gap-2">
            {row.color && (
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            )}
            <span className={cn(!row.color && 'ml-[1.125rem]')}>{row.label}</span>
          </dt>
          <dd className="font-medium tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>

    {footer && <p className="mt-2 text-xs text-muted-foreground">{footer}</p>}
  </div>
);

export default ChartTooltip;

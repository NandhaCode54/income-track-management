import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PieChart } from 'lucide-react';
import ChartCard from '@/components/charts/ChartCard';
import ChartTooltip from '@/components/charts/ChartTooltip';
import {
  AXIS_TICK_STYLE,
  CHART_CHROME,
  CHART_COLORS,
} from '@/components/charts/chart.tokens';
import EmptyState from '@/components/common/EmptyState';
import { useCurrency } from '@/hooks/useCurrency';
import type { CategorySlice } from '@/types/dashboard.types';

interface SpendingByCategoryProps {
  slices: CategorySlice[];
  periodLabel: string;
  isStale?: boolean;
}

const TICK_WIDTH = 150;

/** Long category paths ("Food & Dining › Groceries") get an ellipsis, never a clip. */
const truncate = (label: string, max = 20): string =>
  label.length <= max ? label : `${label.slice(0, max - 1)}…`;

/**
 * A single-line category tick.
 *
 * Recharts' default tick wraps the label to fit the axis band, which turned
 * "Food & Dining › Groceries" into two stacked lines colliding with the bar above.
 * One `<text>` node cannot wrap, so the ellipsis is the only thing that gives, and
 * the full name stays available in the tooltip and the table view.
 */
const CategoryTick = ({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) => (
  <text
    x={x}
    y={y}
    dy={4}
    textAnchor="end"
    fill={CHART_CHROME.tick}
    fontSize={12}
    // The untruncated name, for a screen reader and for the browser's own tooltip.
    aria-label={payload?.value}
  >
    <title>{payload?.value}</title>
    {truncate(payload?.value ?? '')}
  </text>
);

/** Roughly 24px a row plus the axis band, so the card is never taller than its data. */
const heightFor = (rows: number): number => Math.max(180, rows * 40 + 48);

/**
 * Where the month's money went, ranked.
 *
 * **One hue for every bar.** The categories carry their own colours elsewhere in
 * the app, but here the job is comparing magnitude and bar length already does
 * that — painting each bar a different hue would spend the only free channel on
 * information the chart has already shown, and put a handful of unvalidated hues
 * side by side. The single hue is the expense hue used by the cash-flow line, so
 * "orange means money out" holds across the page.
 */
const SpendingByCategory = ({ slices, periodLabel, isStale }: SpendingByCategoryProps) => {
  const { format, formatCompact } = useCurrency();

  const chart = (
    <div className="w-full" style={{ height: heightFor(slices.length) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={slices}
          layout="vertical"
          margin={{ top: 4, right: 64, bottom: 4, left: 4 }}
          barCategoryGap="28%"
        >
          <CartesianGrid stroke={CHART_CHROME.grid} strokeWidth={1} horizontal={false} />

          <XAxis
            type="number"
            tick={AXIS_TICK_STYLE}
            tickLine={false}
            axisLine={{ stroke: CHART_CHROME.axis }}
            tickFormatter={(value: number) => formatCompact(value)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={<CategoryTick />}
            tickLine={false}
            axisLine={{ stroke: CHART_CHROME.axis }}
            width={TICK_WIDTH}
          />

          <Tooltip
            cursor={{ fill: CHART_CHROME.grid, fillOpacity: 0.4 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const slice = payload[0].payload as CategorySlice;

              return (
                <ChartTooltip
                  title={slice.label}
                  rows={[
                    { label: 'Spent', value: format(slice.total), color: CHART_COLORS.expense },
                    { label: 'Share', value: `${slice.percentage}%` },
                  ]}
                />
              );
            }}
          />

          <Bar
            dataKey="total"
            fill={CHART_COLORS.expense}
            // Capped rather than filling the band — the leftover is the air.
            maxBarSize={20}
            // Rounded at the data end, square at the baseline.
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            {/* The value sits outside the bar end, so it can never be clipped by a
                short bar or overflow a long one. */}
            <LabelList
              dataKey="total"
              position="right"
              offset={8}
              fill={CHART_CHROME.tick}
              fontSize={12}
              formatter={(value: number) => formatCompact(value)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Spending by category for {periodLabel}</caption>
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-medium">
              Category
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Spent
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Share
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {slices.map((slice) => (
            <tr key={slice.key}>
              <th scope="row" className="py-2 pr-3 text-left font-normal">
                {slice.label}
              </th>
              <td className="py-2 pr-3 text-right tabular-nums">{format(slice.total)}</td>
              <td className="py-2 text-right tabular-nums text-muted-foreground">
                {slice.percentage}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <ChartCard
      title="Where the money went"
      description={`Spending by category in ${periodLabel}. The tail beyond the top few is grouped as "Other".`}
      chart={chart}
      table={table}
      isEmpty={slices.length === 0}
      isStale={isStale}
      empty={
        <EmptyState
          icon={PieChart}
          title={`No spending in ${periodLabel}`}
          description="Once expenses are recorded for this month, the split appears here."
        />
      }
    />
  );
};

export default SpendingByCategory;

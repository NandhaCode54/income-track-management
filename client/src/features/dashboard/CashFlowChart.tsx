import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from '@/components/charts/ChartCard';
import ChartLegend, { type LegendSeries } from '@/components/charts/ChartLegend';
import ChartTooltip from '@/components/charts/ChartTooltip';
import {
  ACTIVE_DOT_RADIUS,
  AXIS_TICK_STYLE,
  CHART_CHROME,
  CHART_COLORS,
  DOT_RADIUS,
  DOT_RING_WIDTH,
  LINE_WIDTH,
} from '@/components/charts/chart.tokens';
import EmptyState from '@/components/common/EmptyState';
import { useCurrency } from '@/hooks/useCurrency';
import { MONTH_NAMES } from '@/utils/formatDate';
import { TrendingUp } from 'lucide-react';
import type { CashFlowPoint } from '@/types/dashboard.types';

interface CashFlowChartProps {
  points: CashFlowPoint[];
  year: number;
  /** The month the page is scoped to — marked on the trend for orientation. */
  month: number;
  isStale?: boolean;
}

const SERIES: LegendSeries[] = [
  { key: 'income', label: 'Income', color: CHART_COLORS.income },
  { key: 'expense', label: 'Expenses', color: CHART_COLORS.expense },
];

/**
 * A year of money in against money out.
 *
 * **One axis, two series.** Both are amounts in the same currency, so they share a
 * scale honestly — the temptation with "income vs expenses" is a second y-axis,
 * which invents a correlation the data does not contain.
 */
const CashFlowChart = ({ points, year, month, isStale }: CashFlowChartProps) => {
  const { format, formatCompact } = useCurrency();

  const hasData = points.some((point) => point.income > 0 || point.expense > 0);
  const currentLabel = points.find((point) => point.month === month)?.label;

  const chart = (
    // Sized to hold the plot *and* the x-axis band, so the card never grows an
    // inner scrollbar to reach the month labels.
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          {/* Horizontal only: the x-axis is categorical, so vertical rules would
              be decoration. Solid hairlines — dashing reads as "projection". */}
          <CartesianGrid stroke={CHART_CHROME.grid} strokeWidth={1} vertical={false} />

          <XAxis
            dataKey="label"
            tick={AXIS_TICK_STYLE}
            tickLine={false}
            axisLine={{ stroke: CHART_CHROME.axis }}
            interval="preserveStartEnd"
            minTickGap={4}
          />
          <YAxis
            tick={AXIS_TICK_STYLE}
            tickLine={false}
            axisLine={false}
            width={68}
            tickFormatter={(value: number) => formatCompact(value)}
          />

          {currentLabel && (
            <ReferenceLine
              x={currentLabel}
              stroke={CHART_CHROME.axis}
              strokeWidth={1}
              label={{
                value: 'This month',
                position: 'insideTopRight',
                fill: CHART_CHROME.tick,
                fontSize: 11,
              }}
            />
          )}

          <Tooltip
            cursor={{ stroke: CHART_CHROME.axis, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as CashFlowPoint;

              return (
                <ChartTooltip
                  title={`${MONTH_NAMES[point.month - 1]} ${year}`}
                  rows={[
                    { label: 'Income', value: format(point.income), color: CHART_COLORS.income },
                    { label: 'Expenses', value: format(point.expense), color: CHART_COLORS.expense },
                    {
                      label: point.net < 0 ? 'Overspent' : 'Kept',
                      value: format(Math.abs(point.net)),
                      isTotal: true,
                    },
                  ]}
                  footer={label === currentLabel ? 'The month shown above' : undefined}
                />
              );
            }}
          />

          <Line
            type="monotone"
            dataKey="income"
            name="Income"
            stroke={CHART_COLORS.income}
            strokeWidth={LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            // The ring is the card colour, so a marker stays legible where the two
            // lines cross instead of needing an outline drawn round it.
            dot={{
              r: DOT_RADIUS,
              fill: CHART_COLORS.income,
              stroke: CHART_CHROME.surface,
              strokeWidth: DOT_RING_WIDTH,
            }}
            activeDot={{ r: ACTIVE_DOT_RADIUS, stroke: CHART_CHROME.surface, strokeWidth: DOT_RING_WIDTH }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="expense"
            name="Expenses"
            stroke={CHART_COLORS.expense}
            strokeWidth={LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{
              r: DOT_RADIUS,
              fill: CHART_COLORS.expense,
              stroke: CHART_CHROME.surface,
              strokeWidth: DOT_RING_WIDTH,
            }}
            activeDot={{ r: ACTIVE_DOT_RADIUS, stroke: CHART_CHROME.surface, strokeWidth: DOT_RING_WIDTH }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Income, expenses and the balance kept for each month of {year}
        </caption>
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-medium">
              Month
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Income
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Expenses
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Kept
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {points.map((point) => (
            <tr key={point.month} className={point.month === month ? 'font-medium' : undefined}>
              <th scope="row" className="py-2 pr-3 text-left font-normal">
                {MONTH_NAMES[point.month - 1]}
                {point.month === month && (
                  <span className="ml-2 text-xs text-muted-foreground">· shown above</span>
                )}
              </th>
              <td className="py-2 pr-3 text-right tabular-nums">{format(point.income)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{format(point.expense)}</td>
              <td className="py-2 text-right tabular-nums">
                {point.net < 0 ? `−${format(Math.abs(point.net))}` : format(point.net)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <ChartCard
      title="Cash flow"
      description={`Money in against money out across ${year}.`}
      legend={<ChartLegend series={SERIES} />}
      chart={chart}
      table={table}
      isEmpty={!hasData}
      isStale={isStale}
      empty={
        <EmptyState
          icon={TrendingUp}
          title={`Nothing recorded in ${year}`}
          description="Add income and expenses and the year's trend appears here."
        />
      }
    />
  );
};

export default CashFlowChart;

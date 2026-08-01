export interface LegendSeries {
  key: string;
  label: string;
  color: string;
}

/**
 * Always rendered for two or more series — it is the dependable identity channel,
 * so a reader never has to match colours across the plot on their own. The swatch
 * carries the series colour; the label stays in text ink.
 */
const ChartLegend = ({ series }: { series: LegendSeries[] }) => (
  <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
    {series.map((item) => (
      <li key={item.key} className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          aria-hidden
          className="h-0.5 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        {item.label}
      </li>
    ))}
  </ul>
);

export default ChartLegend;

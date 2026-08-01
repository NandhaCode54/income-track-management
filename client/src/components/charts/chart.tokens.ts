/**
 * Shared chart chrome and the two data colours.
 *
 * The colours are CSS custom properties (declared in `index.css`) rather than hex
 * literals, so light and dark swap in one place and an SVG attribute can read them
 * directly. The chrome reuses the app's own `--border` / `--muted-foreground`
 * tokens: gridlines and axes are hairlines one step off the surface, never dashed,
 * and always more recessive than the data.
 */

export const CHART_COLORS = {
  /** Money in. */
  income: 'var(--chart-income)',
  /** Money out — also the single hue used by the spending bars. */
  expense: 'var(--chart-expense)',
} as const;

export const CHART_CHROME = {
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--border))',
  tick: 'hsl(var(--muted-foreground))',
  /** Marks and rings are punched in the card colour, so they read as negative space. */
  surface: 'hsl(var(--card))',
} as const;

/** 2px lines, ≥8px markers, hairline grid — the fixed mark specs. */
export const LINE_WIDTH = 2;
export const DOT_RADIUS = 4;
export const ACTIVE_DOT_RADIUS = 5;
/** The surface ring that keeps a marker legible where it crosses another line. */
export const DOT_RING_WIDTH = 2;

export const AXIS_TICK_STYLE = {
  fill: CHART_CHROME.tick,
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
} as const;

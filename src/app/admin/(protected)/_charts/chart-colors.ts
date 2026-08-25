/**
 * Chart colors reference the same CSS custom properties `globals.css`
 * defines for the rest of the admin UI (`--color-primary`, etc.) instead of
 * hardcoded hex values, so a chart's palette follows the brand tokens and
 * dark/light mode automatically — no separate "chart theme" to keep in sync.
 */
export const CHART_COLORS = {
  primary: 'var(--color-primary)',
  accent: 'var(--color-accent)',
  success: 'var(--color-success)',
  destructive: 'var(--color-destructive)',
  secondary: 'var(--color-secondary-foreground)',
  muted: 'var(--color-muted-foreground)',
  border: 'var(--color-border)',
} as const;

/** Categorical series order for multi-line/multi-bar charts (top products, etc.). */
export const CHART_SERIES_COLORS: readonly string[] = [
  CHART_COLORS.primary,
  CHART_COLORS.accent,
  CHART_COLORS.success,
  CHART_COLORS.destructive,
  CHART_COLORS.secondary,
];

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: CHART_COLORS.muted,
  processing: CHART_COLORS.accent,
  shipped: CHART_COLORS.primary,
  delivered: CHART_COLORS.success,
  cancelled: CHART_COLORS.destructive,
};

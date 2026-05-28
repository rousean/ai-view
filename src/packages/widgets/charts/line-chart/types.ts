import type { FontStyle } from '@designer/setters'

/**
 * Per-series options for the line chart. Lives inside a `series` array
 * on `LineChartProps`. The SeriesListSetter renders one row per entry,
 * exposing per-series colour / smoothness / marker visibility.
 *
 * `id` is the persistent identity used by SeriesListSetter for sort
 * stability — distinct from `name` (the user-facing label that can be
 * renamed without losing track of which row is which).
 */
export interface LineSeriesConfig {
  id: string
  name: string
  color: string
  /** 0 = sharp polyline, 1 = monotone cubic spline. */
  smooth: number
  /** Show point markers along the line. */
  showSymbol: boolean
  /** Draw area fill under the line. */
  area: boolean
}

/** LineChart-specific props. Validated by zod inside index.ts. */
export interface LineChartProps {
  // ── Title
  title: string
  showTitle: boolean
  titleFont: FontStyle
  // ── Legend
  showLegend: boolean
  legendFont: FontStyle
  // ── Axes
  showXAxis: boolean
  xAxisFont: FontStyle
  showYAxis: boolean
  yAxisFont: FontStyle
  showYGrid: boolean
  // ── Stroke baseline (defaults applied to series rows that don't override)
  lineWidth: number
  // ── Series — managed by SeriesListSetter
  series: LineSeriesConfig[]
  // ── Data labels
  showLabels: boolean
  labelFont: FontStyle
}

import type { FontStyle } from '@designer/setters'

/** BarChart-specific props. Validated by zod inside meta.ts. */
export interface BarChartProps {
  // ── Title ─────────────────────────────────────────────────────
  /** Visible chart title above the bars. Empty hides the title row. */
  title: string
  /** Master toggle for the title section. */
  showTitle: boolean
  /** Compound title font style (colour + size + weight). */
  titleFont: FontStyle

  // ── Legend ────────────────────────────────────────────────────
  /** Show legend (only relevant when there are multiple series). */
  showLegend: boolean
  legendFont: FontStyle

  // ── X axis ────────────────────────────────────────────────────
  showXAxis: boolean
  xAxisFont: FontStyle

  // ── Y axis ────────────────────────────────────────────────────
  showYAxis: boolean
  yAxisFont: FontStyle
  /** Show horizontal grid lines aligned to Y ticks. */
  showYGrid: boolean

  // ── Series ────────────────────────────────────────────────────
  /** Bar color (hex). Falls back to a built-in default when empty. */
  barColor: string
  /** Bar border radius (top corners). */
  barRadius: number

  // ── Data labels ───────────────────────────────────────────────
  /** Show value labels on top of bars. */
  showLabels: boolean
  labelFont: FontStyle
}

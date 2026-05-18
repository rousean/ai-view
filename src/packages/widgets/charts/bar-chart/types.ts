/** BarChart-specific props. Validated by zod inside meta.ts. */
export interface BarChartProps {
  /** Visible chart title above the bars. */
  title: string
  /** Show / hide axes. */
  showXAxis: boolean
  showYAxis: boolean
  /** Bar color (hex). Falls back to theme.palette[0] when empty. */
  barColor: string
  /** Show value labels on top of bars. */
  showLabels: boolean
  /** Show legend (only relevant when there are multiple series). */
  showLegend: boolean
  /** Bar border radius. */
  barRadius: number
}

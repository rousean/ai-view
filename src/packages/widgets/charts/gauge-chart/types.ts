import type { FontStyle } from '@designer/setters'

/** How the bound column is reduced to the single gauge value. */
export type GaugeAggregate = 'last' | 'first' | 'sum' | 'avg' | 'max' | 'min'

/** Gauge-chart-specific props. Validated by zod inside index.ts. */
export interface GaugeChartProps {
  title: string
  showTitle: boolean
  titleFont: FontStyle
  /** Reduce the value column to one figure. */
  aggregate: GaugeAggregate
  /** Scale start. */
  min: number
  /** Scale end. */
  max: number
  /** Decimal places shown in the centre readout. */
  decimals: number
  /** Suffix on the readout (e.g. `%`). */
  unit: string
  /** Progress arc + pointer colour. */
  valueColor: string
}

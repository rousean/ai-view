import type { FontStyle } from '@designer/setters'
import type { ConditionalRule } from '../../shared/conditional'

/** Aggregation applied to the bound measure column to get a single number. */
export type NumberAggregate =
  | 'sum'
  | 'avg'
  | 'max'
  | 'min'
  | 'last'
  | 'first'
  | 'count'

/** Number / KPI card props. Validated by zod inside index.ts. */
export interface NumberCardProps {
  // ── Value ─────────────────────────────────────────────────────
  /** How the bound column is reduced to one number. */
  aggregate: NumberAggregate
  /** Decimal places (0–4). */
  decimals: number
  /** Group the integer part with thousands separators. */
  thousands: boolean
  /** Text shown before the number (e.g. `¥`). */
  prefix: string
  /** Text shown after the number (e.g. `万` / `%`). */
  suffix: string
  valueFont: FontStyle

  // ── Label ─────────────────────────────────────────────────────
  showLabel: boolean
  label: string
  labelFont: FontStyle
  /** Label above or below the number. */
  labelPosition: 'top' | 'bottom'

  // ── Box ───────────────────────────────────────────────────────
  align: 'left' | 'center' | 'right'
  background: string
  padding: number

  // ── Conditional formatting ────────────────────────────────────
  /** Threshold rules — the first match recolours the value. */
  rules?: ConditionalRule[]
}

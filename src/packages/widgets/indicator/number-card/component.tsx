import * as React from 'react'
import type { WidgetRenderProps } from '../../widget-meta'
import type { NumberAggregate, NumberCardProps } from './types'
import { DEFAULT_NUMBER_CARD_PROPS } from './default-props'

const H_ALIGN = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const

/** Reduce a measure column to one number per the chosen aggregate. */
function aggregate(values: number[], mode: NumberAggregate): number {
  if (mode === 'count') return values.length
  const nums = values.filter((v) => Number.isFinite(v))
  if (nums.length === 0) return 0
  switch (mode) {
    case 'sum':
      return nums.reduce((a, b) => a + b, 0)
    case 'avg':
      return nums.reduce((a, b) => a + b, 0) / nums.length
    case 'max':
      return Math.max(...nums)
    case 'min':
      return Math.min(...nums)
    case 'first':
      return nums[0]
    case 'last':
      return nums[nums.length - 1]
    default:
      return 0
  }
}

/** Fixed decimals + optional thousands grouping, sign-safe. */
function formatNumber(n: number, decimals: number, thousands: boolean): string {
  const safe = Number.isFinite(n) ? n : 0
  const fixed = safe.toFixed(Math.max(0, Math.min(4, Math.round(decimals))))
  if (!thousands) return fixed
  const neg = fixed.startsWith('-')
  const [int, frac] = (neg ? fixed.slice(1) : fixed).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (neg ? '-' : '') + grouped + (frac ? '.' + frac : '')
}

/**
 * Number / KPI card — reduces the bound `value` column to a single figure
 * (sum/avg/max/…), formats it (decimals, thousands, prefix/suffix), and
 * shows it big with an optional label above or below. Pure: no echarts.
 */
export const NumberCardComponent: React.FC<WidgetRenderProps<NumberCardProps>> = ({
  props: rawProps,
  data,
  layout,
}) => {
  const props = { ...DEFAULT_NUMBER_CARD_PROPS, ...rawProps }
  const raw = (data.slots.value?.values[0] ?? []) as Array<number | string>
  const value = aggregate(raw.map(Number), props.aggregate)
  const text = formatNumber(value, props.decimals, props.thousands)
  const vf = props.valueFont ?? {}
  const lf = props.labelFont ?? {}

  const labelEl = props.showLabel ? (
    <div
      style={{
        color: lf.color,
        fontSize: lf.size,
        fontWeight: lf.weight,
        fontStyle: lf.italic ? 'italic' : undefined,
        lineHeight: 1.2,
      }}
    >
      {props.label}
    </div>
  ) : null

  const valueEl = (
    <div
      style={{
        color: vf.color,
        fontSize: vf.size,
        fontWeight: vf.weight,
        fontStyle: vf.italic ? 'italic' : undefined,
        lineHeight: 1.1,
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: H_ALIGN[props.align],
        gap: '0.12em',
      }}
    >
      {props.prefix ? <span style={{ fontSize: '0.5em', opacity: 0.8 }}>{props.prefix}</span> : null}
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{text}</span>
      {props.suffix ? <span style={{ fontSize: '0.5em', opacity: 0.8 }}>{props.suffix}</span> : null}
    </div>
  )

  return (
    <div
      style={{
        width: layout.width,
        height: layout.height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: H_ALIGN[props.align],
        textAlign: props.align,
        gap: '0.3em',
        background: props.background || 'transparent',
        padding: props.padding,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {props.labelPosition === 'top' ? (
        <>
          {labelEl}
          {valueEl}
        </>
      ) : (
        <>
          {valueEl}
          {labelEl}
        </>
      )}
    </div>
  )
}

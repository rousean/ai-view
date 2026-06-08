import * as React from 'react'
import type { EChartsOption } from 'echarts'
import type { FontStyle } from '@designer/setters'
import type { WidgetRenderProps } from '../../widget-meta'
import { useEcharts } from '../../shared/use-echarts'
import { DEFAULT_GAUGE_PROPS } from './default-props'
import type { GaugeAggregate, GaugeChartProps } from './types'

function fontToTextStyle(
  font: FontStyle | undefined,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const f = font ?? {}
  return {
    color: f.color,
    fontSize: f.size,
    fontWeight: f.weight,
    fontStyle: f.italic ? 'italic' : undefined,
    ...extra,
  }
}

function aggregate(values: number[], mode: GaugeAggregate): number {
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

/**
 * Gauge — reduces the bound `value` column to one figure and shows it on a
 * radial dial with a progress arc + pointer. Single-value, like the number
 * card but visual. ECharts canvas.
 */
export const GaugeChartComponent: React.FC<WidgetRenderProps<GaugeChartProps>> = ({
  node,
  props: rawProps,
  data,
  layout,
}) => {
  const props = { ...DEFAULT_GAUGE_PROPS, ...rawProps }
  const hasEnterAnim = !!node.animation?.enter

  const option = React.useMemo<EChartsOption>(() => {
    const raw = (data.slots.value?.values[0] ?? []) as Array<number | string>
    const value = aggregate(raw.map(Number), props.aggregate)
    const decimals = Math.max(0, Math.min(4, Math.round(props.decimals)))
    return {
      backgroundColor: 'transparent',
      title:
        props.showTitle && props.title
          ? {
              text: props.title,
              left: 12,
              top: 8,
              textStyle: fontToTextStyle(props.titleFont, { fontWeight: 500 }),
            }
          : undefined,
      series: [
        {
          type: 'gauge',
          min: props.min,
          max: props.max,
          radius: '88%',
          center: ['50%', '56%'],
          progress: { show: true, width: 14, roundCap: true, itemStyle: { color: props.valueColor } },
          axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(0,0,0,0.08)']] } },
          axisTick: { show: false },
          splitLine: { length: 10, lineStyle: { color: 'rgba(0,0,0,0.25)', width: 1 } },
          axisLabel: { color: 'rgba(0,0,0,0.45)', fontSize: 10, distance: 14 },
          pointer: { width: 5, itemStyle: { color: props.valueColor } },
          anchor: { show: true, size: 8, itemStyle: { color: props.valueColor } },
          detail: {
            valueAnimation: !hasEnterAnim,
            formatter: (v: number) => `${Number(v).toFixed(decimals)}${props.unit}`,
            color: props.valueColor,
            fontSize: 22,
            fontWeight: 'bolder',
            offsetCenter: [0, '72%'],
          },
          title: { show: false },
          data: [{ value }],
          animationDuration: hasEnterAnim ? 0 : 900,
        },
      ],
    }
  }, [
    data,
    props.aggregate,
    props.min,
    props.max,
    props.decimals,
    props.unit,
    props.valueColor,
    props.showTitle,
    props.title,
    props.titleFont,
    hasEnterAnim,
  ])

  const chartRef = useEcharts(option, { width: layout.width, height: layout.height })

  return (
    <div
      ref={chartRef}
      style={{ width: layout.width, height: layout.height, background: 'transparent' }}
    />
  )
}

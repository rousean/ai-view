import * as React from 'react'
import type { EChartsOption } from 'echarts'
import type { WidgetRenderProps } from '../../widget-meta'
import { useEcharts } from '../../shared/use-echarts'
import type { BarChartProps } from './types'
import { DEFAULT_BAR_PROPS } from './default-props'

/**
 * Bar chart — single-series for now (`y` slot cardinality is 'one').
 * Data comes resolved (slots already projected) — no per-component
 * normalization, no alias-tolerance, no FALLBACK_DATA. The resolver
 * (`@designer/data`) takes care of picking inline vs bound vs sample
 * and projecting columns into the slot shape the component reads.
 */
export const BarChartComponent: React.FC<WidgetRenderProps<BarChartProps>> = ({
  props: rawProps,
  data,
  layout,
}) => {
  const props = { ...DEFAULT_BAR_PROPS, ...rawProps }

  const color = props.barColor || '#0d99ff'
  // ECharts wants concrete colour strings; CSS var() isn't readable from JS.
  const fgColor = '#1e1e1e'
  const axisColor = 'rgba(0,0,0,0.45)'
  const splitColor = 'rgba(0,0,0,0.06)'

  // `data` is always present (ResolvedWidgetData); empty slots just
  // mean the user hasn't mapped that slot yet — chart renders empty
  // axes instead of crashing.
  //
  // Slot reads + the option object live inside useMemo so we depend on
  // the stable `data` reference (memoized by the resolver in
  // WidgetContainer) rather than per-render projections of it.
  const option = React.useMemo<EChartsOption>(() => {
    const xValues = (data.slots.x?.values[0] ?? []) as Array<string | number>
    const yValues = (data.slots.y?.values[0] ?? []) as Array<number>
    return {
      backgroundColor: 'transparent',
      title: props.title
        ? {
            text: props.title,
            left: 12,
            top: 8,
            textStyle: { fontSize: 14, color: fgColor, fontWeight: 500 },
          }
        : undefined,
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: props.title ? 40 : 16, bottom: 32 },
      legend: props.showLegend
        ? { show: true, top: 8, right: 12, textStyle: { color: fgColor } }
        : undefined,
      xAxis: {
        show: props.showXAxis,
        type: 'category',
        data: xValues.map(String),
        axisLine: { lineStyle: { color: axisColor } },
        axisLabel: { color: fgColor, fontSize: 11 },
      },
      yAxis: {
        show: props.showYAxis,
        type: 'value',
        axisLine: { lineStyle: { color: axisColor } },
        splitLine: { lineStyle: { color: splitColor } },
        axisLabel: { color: fgColor, fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          // Filter to finite numbers — coerced cells may carry NaN
          // from an in-flight user edit; ECharts would render a gap.
          data: yValues.map((v) => (Number.isFinite(v) ? v : null)),
          itemStyle: {
            color,
            borderRadius: [props.barRadius, props.barRadius, 0, 0],
          },
          label: props.showLabels
            ? {
                show: true,
                position: 'top',
                color: fgColor,
                fontSize: 11,
              }
            : { show: false },
          animationDuration: 300,
        },
      ],
    }
  }, [
    data,
    color,
    props.barRadius,
    props.showLabels,
    props.showLegend,
    props.showXAxis,
    props.showYAxis,
    props.title,
  ])

  const chartRef = useEcharts(option, { width: layout.width, height: layout.height })

  return (
    <div
      ref={chartRef}
      style={{
        width: layout.width,
        height: layout.height,
        background: 'transparent',
      }}
    />
  )
}

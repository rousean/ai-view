import * as React from 'react'
import type { EChartsOption } from 'echarts'
import type { FontStyle } from '@designer/setters'
import type { WidgetRenderProps } from '../../widget-meta'
import { useEcharts } from '../../shared/use-echarts'
import type { BarChartProps } from './types'
import { DEFAULT_BAR_PROPS } from './default-props'

/**
 * Translate a {@link FontStyle} bag into the loose text-style object
 * ECharts expects (`color` / `fontSize` / `fontWeight` / `fontStyle`).
 * `extra` is merged in last so per-call overrides like `fontWeight: 500`
 * on the title win.
 */
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

/**
 * Bar chart — single-series for now (`y` slot cardinality is 'one').
 * Data comes resolved (slots already projected) — no per-component
 * normalization, no alias-tolerance, no FALLBACK_DATA. The resolver
 * (`@designer/data`) takes care of picking inline vs bound vs sample
 * and projecting columns into the slot shape the component reads.
 */
export const BarChartComponent: React.FC<WidgetRenderProps<BarChartProps>> = ({
  node,
  props: rawProps,
  data,
  layout,
  onInteract,
}) => {
  const props = { ...DEFAULT_BAR_PROPS, ...rawProps }

  // `barColor` is always a concrete value now (default ships as
  // '#0D99FF'); the palette-paint pass on addWidget keeps new widgets
  // aligned with the project palette automatically.
  const color = props.barColor
  // ECharts wants concrete colour strings; CSS var() isn't readable from JS.
  const axisColor = 'rgba(0,0,0,0.45)'
  const splitColor = 'rgba(0,0,0,0.06)'

  // Animation contract:
  //   - `widget.animation.enter` set → the outer WidgetContainer's CSS
  //     keyframe owns the mount animation, so we silence ECharts' own
  //     entry (animationDuration: 0) to avoid the double-play.
  //   - `widget.animation.update.duration` → ECharts data-update transition.
  //     Falls back to ECharts' built-in default (300) when unspecified.
  const hasEnterAnim = !!node.animation?.enter
  const updateDuration = node.animation?.update?.duration ?? 300

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
      title:
        props.showTitle && props.title
          ? {
              text: props.title,
              left: 12,
              top: 8,
              textStyle: fontToTextStyle(props.titleFont, { fontWeight: 500 }),
            }
          : undefined,
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: props.showTitle && props.title ? 40 : 16, bottom: 32 },
      legend: props.showLegend
        ? { show: true, top: 8, right: 12, textStyle: fontToTextStyle(props.legendFont) }
        : undefined,
      xAxis: {
        show: props.showXAxis,
        type: 'category',
        data: xValues.map(String),
        axisLine: { lineStyle: { color: axisColor } },
        axisLabel: fontToTextStyle(props.xAxisFont),
      },
      yAxis: {
        show: props.showYAxis,
        type: 'value',
        axisLine: { lineStyle: { color: axisColor } },
        splitLine: { show: props.showYGrid, lineStyle: { color: splitColor } },
        axisLabel: fontToTextStyle(props.yAxisFont),
      },
      // Top-level animation knobs — apply to *all* component groups.
      // The series block overrides `animationDuration` to 0 when the
      // outer CSS handles entry; otherwise it inherits this default.
      animation: true,
      animationDuration: hasEnterAnim ? 0 : 300,
      animationDurationUpdate: updateDuration,
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
            ? { show: true, position: 'top', ...fontToTextStyle(props.labelFont) }
            : { show: false },
          animationDuration: hasEnterAnim ? 0 : 300,
          animationDurationUpdate: updateDuration,
        },
      ],
    }
  }, [
    data,
    color,
    props.barRadius,
    props.showLabels,
    props.labelFont,
    props.showLegend,
    props.legendFont,
    props.showXAxis,
    props.xAxisFont,
    props.showYAxis,
    props.yAxisFont,
    props.showYGrid,
    props.showTitle,
    props.title,
    props.titleFont,
    hasEnterAnim,
    updateDuration,
  ])

  const chartRef = useEcharts(
    option,
    { width: layout.width, height: layout.height },
    undefined,
    onInteract ? (detail) => onInteract('click', detail) : undefined,
  )

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

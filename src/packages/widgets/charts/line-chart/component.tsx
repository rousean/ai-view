import * as React from 'react'
import type { EChartsOption } from 'echarts'
import type { FontStyle } from '@designer/setters'
import type { WidgetRenderProps } from '../../widget-meta'
import { useEcharts } from '../../shared/use-echarts'
import { DEFAULT_LINE_PROPS } from './default-props'
import type { LineChartProps, LineSeriesConfig } from './types'

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
 * Multi-series line chart. Reads the resolved `y` slot — cardinality
 * 'many' — as a parallel array of column-value arrays, then zips with
 * the props' `series[]` (containing colour/name/style overrides keyed
 * by position).
 *
 * Pairing rule: `series[i]` pairs with `data.slots.y.values[i]`. The
 * SeriesListSetter is responsible for keeping the `series` array in
 * sync with the mapping length; widgets opened from older files may
 * have mismatched counts, so the renderer falls back to defaults for
 * unmatched indices.
 */
export const LineChartComponent: React.FC<WidgetRenderProps<LineChartProps>> = ({
  node,
  props: rawProps,
  data,
  layout,
  onInteract,
}) => {
  const props = { ...DEFAULT_LINE_PROPS, ...rawProps }
  const axisColor = 'rgba(0,0,0,0.45)'
  const splitColor = 'rgba(0,0,0,0.06)'
  const hasEnterAnim = !!node.animation?.enter
  const updateDuration = node.animation?.update?.duration ?? 300

  const option = React.useMemo<EChartsOption>(() => {
    const xValues = (data.slots.x?.values[0] ?? []) as Array<string | number>
    const ySeries = (data.slots.y?.values ?? []) as Array<Array<number>>
    const yNames = data.slots.y?.columnNames ?? []

    // Reconcile UI series config with the actual columns. If the user
    // has only configured 1 series row but mapped 3 columns, the extra
    // columns render with synthesized defaults so the chart isn't blank.
    const seriesCount = Math.max(ySeries.length, props.series.length, 1)
    const reconciled: LineSeriesConfig[] = []
    for (let i = 0; i < seriesCount; i++) {
      const cfg = props.series[i]
      const fallbackName = yNames[i] ?? `系列 ${i + 1}`
      reconciled.push({
        id: cfg?.id ?? `series-${i}`,
        name: cfg?.name ?? fallbackName,
        color: cfg?.color ?? '#0D99FF',
        smooth: cfg?.smooth ?? 0.4,
        showSymbol: cfg?.showSymbol ?? true,
        area: cfg?.area ?? false,
      })
    }

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
        boundaryGap: false,
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
      animation: true,
      animationDuration: hasEnterAnim ? 0 : 300,
      animationDurationUpdate: updateDuration,
      series: reconciled.map((cfg, i) => {
        const values = ySeries[i] ?? []
        return {
          type: 'line',
          name: cfg.name,
          smooth: cfg.smooth,
          showSymbol: cfg.showSymbol,
          symbolSize: 6,
          lineStyle: { color: cfg.color, width: props.lineWidth },
          itemStyle: { color: cfg.color },
          areaStyle: cfg.area
            ? {
                color: cfg.color,
                opacity: 0.2,
              }
            : undefined,
          // NaN-filter so an in-flight typed cell doesn't blow up the
          // path renderer; ECharts replaces nulls with a gap.
          data: values.map((v) => (Number.isFinite(v) ? v : null)),
          label: props.showLabels
            ? { show: true, position: 'top', ...fontToTextStyle(props.labelFont) }
            : { show: false },
          animationDuration: hasEnterAnim ? 0 : 600,
          animationDurationUpdate: updateDuration,
        }
      }),
    }
  }, [
    data,
    props.series,
    props.lineWidth,
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

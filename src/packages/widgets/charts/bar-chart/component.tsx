import * as React from 'react';
import type { EChartsOption } from 'echarts';
import type { WidgetRenderProps } from '../../widget-meta';
import { useEcharts } from '../../shared/use-echarts';
import type { BarChartProps } from './types';
import { DEFAULT_BAR_PROPS } from './default-props';

/** Demo / fallback dataset used when no databinding is configured. */
const FALLBACK_DATA = [
  { category: '一月', value: 120 },
  { category: '二月', value: 200 },
  { category: '三月', value: 150 },
  { category: '四月', value: 80 },
  { category: '五月', value: 70 },
  { category: '六月', value: 110 },
];

interface MappedRow {
  x: string | number;
  y: number;
}

function normalizeData(input: unknown): MappedRow[] {
  if (!Array.isArray(input) || input.length === 0) return [];
  return input
    .map((row) => {
      if (row && typeof row === 'object') {
        const r = row as Record<string, unknown>;
        return {
          x: (r.x ?? r.category ?? r.name ?? '') as string | number,
          y: Number(r.y ?? r.value ?? 0),
        };
      }
      return null;
    })
    .filter((r): r is MappedRow => r !== null && Number.isFinite(r.y));
}

export const BarChartComponent: React.FC<WidgetRenderProps<BarChartProps>> = ({
  props: rawProps,
  data,
  layout,
  theme,
}) => {
  const props = { ...DEFAULT_BAR_PROPS, ...rawProps };

  const rows = React.useMemo(() => {
    const normalized = normalizeData(data);
    return normalized.length > 0 ? normalized : FALLBACK_DATA.map((d) => ({ x: d.category, y: d.value }));
  }, [data]);

  const color = props.barColor || theme?.palette?.[0] || '#5b8def';

  const option = React.useMemo<EChartsOption>(() => {
    return {
      backgroundColor: 'transparent',
      title: props.title
        ? {
            text: props.title,
            left: 12,
            top: 8,
            textStyle: { fontSize: 14, color: theme?.tokens['--fg'] ?? '#e6edf6', fontWeight: 500 },
          }
        : undefined,
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: props.title ? 40 : 16, bottom: 32 },
      legend: props.showLegend
        ? { show: true, top: 8, right: 12, textStyle: { color: theme?.tokens['--fg'] } }
        : undefined,
      xAxis: {
        show: props.showXAxis,
        type: 'category',
        data: rows.map((r) => String(r.x)),
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { color: theme?.tokens['--fg'] ?? '#e6edf6', fontSize: 11 },
      },
      yAxis: {
        show: props.showYAxis,
        type: 'value',
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: theme?.tokens['--fg'] ?? '#e6edf6', fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: rows.map((r) => r.y),
          itemStyle: {
            color,
            borderRadius: [props.barRadius, props.barRadius, 0, 0],
          },
          label: props.showLabels
            ? {
                show: true,
                position: 'top',
                color: theme?.tokens['--fg'] ?? '#e6edf6',
                fontSize: 11,
              }
            : { show: false },
          animationDuration: 300,
        },
      ],
    };
  }, [rows, color, props.barRadius, props.showLabels, props.showLegend, props.showXAxis, props.showYAxis, props.title, theme]);

  const chartRef = useEcharts(option, { width: layout.width, height: layout.height });

  return (
    <div
      ref={chartRef}
      style={{
        width: layout.width,
        height: layout.height,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 4,
      }}
    />
  );
};

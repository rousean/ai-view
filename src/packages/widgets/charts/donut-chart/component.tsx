import * as React from 'react';
import {
  arc,
  hsl,
  interpolateRainbow,
  pie,
  select,
  type PieArcDatum,
} from 'd3';
import type { WidgetRenderProps } from '../../widget-meta';
import { DEFAULT_DONUT_PROPS } from './default-props';
import type { DonutChartProps } from './types';

interface PieDatum {
  name: string;
  value: number;
}

/** Demo dataset shown when no databinding is configured. */
const FALLBACK_DATA: PieDatum[] = [
  { name: 'JavaScript', value: 500 },
  { name: 'Python', value: 200 },
  { name: 'Java', value: 300 },
  { name: 'C++', value: 400 },
  { name: 'C#', value: 100 },
];

/** Coerce arbitrary mapped data into `{name, value}` rows. */
function normalizeData(input: unknown): PieDatum[] {
  if (!Array.isArray(input) || input.length === 0) return [];
  return input
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const rawName = r.name ?? r.label ?? r.category ?? r.x ?? '';
      const rawValue = r.value ?? r.y ?? 0;
      const value = Number(rawValue);
      const name = String(rawName);
      if (!name || !Number.isFinite(value)) return null;
      return { name, value };
    })
    .filter((row): row is PieDatum => row !== null);
}

/** Pop a slice outward along its bisector by `move` pixels. */
function calcTranslate(d: PieArcDatum<PieDatum>, move: number): string {
  const mid = d.startAngle + (d.endAngle - d.startAngle) / 2;
  return `translate(${-move * Math.cos(mid + Math.PI / 2)}, ${-move * Math.sin(mid + Math.PI / 2)})`;
}

export const DonutChartComponent: React.FC<WidgetRenderProps<DonutChartProps>> = ({
  props: rawProps,
  data,
  layout,
  theme,
}) => {
  const props = { ...DEFAULT_DONUT_PROPS, ...rawProps };
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const rows = React.useMemo(() => {
    const normalized = normalizeData(data);
    return normalized.length > 0 ? normalized : FALLBACK_DATA;
  }, [data]);

  // Stable colour palette: prefer theme.palette; fall back to d3 rainbow.
  const palette = React.useMemo(() => {
    const fromTheme = theme?.palette ?? [];
    if (fromTheme.length >= rows.length) return fromTheme.slice(0, rows.length);
    // Synthesize the missing slots from interpolateRainbow.
    const out = [...fromTheme];
    for (let i = out.length; i < rows.length; i++) {
      out.push(interpolateRainbow(i / Math.max(rows.length, 1)));
    }
    return out;
  }, [theme, rows.length]);

  React.useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const titleHeight = props.title ? 24 : 0;
    const innerW = Math.max(layout.width - props.padding * 2, 0);
    const innerH = Math.max(
      layout.height - props.padding * 2 - titleHeight,
      0,
    );
    const cx = props.padding + innerW / 2;
    const cy = props.padding + titleHeight + innerH / 2;

    // Title
    if (props.title) {
      svg
        .append('text')
        .attr('x', layout.width / 2)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('fill', theme?.tokens['--fg'] ?? '#e6edf6')
        .attr('font-size', 14)
        .text(props.title);
    }

    const outer = Math.min(innerW, innerH) / 2;
    if (outer <= 0) return;
    const inner = outer * Math.max(0, Math.min(props.innerRadiusPercent / 100, 1));

    const g = svg.append('g').attr('transform', `translate(${cx}, ${cy})`);

    const arcGen = arc<PieArcDatum<PieDatum>>()
      .innerRadius(inner)
      .outerRadius(outer)
      .cornerRadius(props.cornerRadius);

    const pieData = pie<PieDatum>()
      .padAngle(props.padAngle)
      .value((d) => d.value)(rows);

    const withColor = pieData.map((slice, i) => ({
      ...slice,
      color: palette[i % palette.length],
    }));

    const groups = g
      .selectAll<SVGGElement, (typeof withColor)[number]>('g')
      .data(withColor)
      .enter()
      .append('g');

    if (props.enableHover) {
      groups
        .on('mouseover', function (_, d) {
          select(this)
            .transition()
            .duration(200)
            .attr('transform', calcTranslate(d, 8));
          select(this)
            .select('path')
            .attr('stroke', hsl(d.color).darker(1).toString());
        })
        .on('mouseout', function (_, d) {
          select(this)
            .transition()
            .duration(200)
            .attr('transform', 'translate(0, 0)');
          select(this).select('path').attr('stroke', d.color);
        });
    }

    groups
      .append('path')
      .attr('d', arcGen)
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => d.color)
      .attr('opacity', 0.9);

    if (props.showLabels) {
      groups
        .append('text')
        .attr('transform', (d) => `translate(${arcGen.centroid(d).join(',')})`)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', 11)
        .style('pointer-events', 'none')
        .style('display', (d) =>
          d.endAngle - d.startAngle > Math.PI / 12 ? 'inline' : 'none',
        )
        .text((d) => d.data.name);
    }
  }, [
    layout.width,
    layout.height,
    props.title,
    props.padding,
    props.innerRadiusPercent,
    props.cornerRadius,
    props.padAngle,
    props.enableHover,
    props.showLabels,
    rows,
    palette,
    theme,
  ]);

  return (
    <svg
      ref={svgRef}
      width={layout.width}
      height={layout.height}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 4,
      }}
    />
  );
};

import * as React from 'react'
import { arc, hsl, interpolateRainbow, pie, select, type PieArcDatum } from 'd3'
import type { WidgetRenderProps } from '../../widget-meta'
import { DEFAULT_DONUT_PROPS } from './default-props'
import type { DonutChartProps } from './types'

interface PieDatum {
  name: string
  value: number
}

const BASE_PALETTE = [
  '#0d99ff',
  '#00d4ff',
  '#7c5cff',
  '#ff5edd',
  '#fbbf24',
  '#14ae5c',
  '#f24822',
]

/** Pop a slice outward along its bisector by `move` pixels. */
function calcTranslate(d: PieArcDatum<PieDatum>, move: number): string {
  const mid = d.startAngle + (d.endAngle - d.startAngle) / 2
  return `translate(${-move * Math.cos(mid + Math.PI / 2)}, ${-move * Math.sin(mid + Math.PI / 2)})`
}

/**
 * Donut chart — single dimension `name`, single measure `value`. Reads
 * resolved slots; no fallback dataset, no normalizeData (resolver
 * already projected the rows into per-slot value arrays).
 */
export const DonutChartComponent: React.FC<WidgetRenderProps<DonutChartProps>> = ({
  props: rawProps,
  data,
  layout,
}) => {
  const props = { ...DEFAULT_DONUT_PROPS, ...rawProps }
  const svgRef = React.useRef<SVGSVGElement | null>(null)

  // Zip parallel slot arrays into d3-friendly { name, value } records,
  // dropping rows where either side is missing/NaN. Slot reads live
  // inside the memo callback so the dep list reduces to the stable
  // `data` reference (memoized by the resolver in WidgetContainer).
  const rows = React.useMemo<PieDatum[]>(() => {
    const nameValues = (data.slots.name?.values[0] ?? []) as Array<string>
    const valueValues = (data.slots.value?.values[0] ?? []) as Array<number>
    const out: PieDatum[] = []
    const n = Math.min(nameValues.length, valueValues.length)
    for (let i = 0; i < n; i++) {
      const name = String(nameValues[i] ?? '').trim()
      const value = Number(valueValues[i])
      if (!name || !Number.isFinite(value)) continue
      out.push({ name, value })
    }
    return out
  }, [data])

  // Built-in palette; synthesize extra colours from d3 rainbow when
  // there are more slices than preset colours.
  const palette = React.useMemo(() => {
    if (BASE_PALETTE.length >= rows.length) return BASE_PALETTE.slice(0, rows.length)
    const out = [...BASE_PALETTE]
    for (let i = out.length; i < rows.length; i++) {
      out.push(interpolateRainbow(i / Math.max(rows.length, 1)))
    }
    return out
  }, [rows.length])

  React.useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)
    svg.selectAll('*').remove()

    const titleHeight = props.title ? 24 : 0
    const innerW = Math.max(layout.width - props.padding * 2, 0)
    const innerH = Math.max(layout.height - props.padding * 2 - titleHeight, 0)
    const cx = props.padding + innerW / 2
    const cy = props.padding + titleHeight + innerH / 2

    if (props.title) {
      svg
        .append('text')
        .attr('x', layout.width / 2)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('fill', '#1e1e1e')
        .attr('font-size', 14)
        .text(props.title)
    }

    const outer = Math.min(innerW, innerH) / 2
    if (outer <= 0) return
    const inner = outer * Math.max(0, Math.min(props.innerRadiusPercent / 100, 1))

    const g = svg.append('g').attr('transform', `translate(${cx}, ${cy})`)

    const arcGen = arc<PieArcDatum<PieDatum>>()
      .innerRadius(inner)
      .outerRadius(outer)
      .cornerRadius(props.cornerRadius)

    const pieData = pie<PieDatum>()
      .padAngle(props.padAngle)
      .value((d) => d.value)(rows)

    const withColor = pieData.map((slice, i) => ({
      ...slice,
      color: palette[i % palette.length],
    }))

    const groups = g
      .selectAll<SVGGElement, (typeof withColor)[number]>('g')
      .data(withColor)
      .enter()
      .append('g')

    if (props.enableHover) {
      groups
        .on('mouseover', function (_, d) {
          select(this).transition().duration(200).attr('transform', calcTranslate(d, 8))
          select(this).select('path').attr('stroke', hsl(d.color).darker(1).toString())
        })
        .on('mouseout', function (_, d) {
          select(this).transition().duration(200).attr('transform', 'translate(0, 0)')
          select(this).select('path').attr('stroke', d.color)
        })
    }

    groups
      .append('path')
      .attr('d', arcGen)
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => d.color)
      .attr('opacity', 0.9)

    if (props.showLabels) {
      groups
        .append('text')
        .attr('transform', (d) => `translate(${arcGen.centroid(d).join(',')})`)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', 11)
        .style('pointer-events', 'none')
        .style('display', (d) => (d.endAngle - d.startAngle > Math.PI / 12 ? 'inline' : 'none'))
        .text((d) => d.data.name)
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
  ])

  return (
    <svg
      ref={svgRef}
      width={layout.width}
      height={layout.height}
      style={{ background: 'transparent' }}
    />
  )
}

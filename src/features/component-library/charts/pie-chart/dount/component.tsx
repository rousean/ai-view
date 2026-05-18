import { useEffect, useMemo, useRef } from 'react'
import { select, pie, interpolateRainbow, arc, hsl, type PieArcDatum } from 'd3'
import { cn } from '~/lib/utils'
import type { Props, Data } from '../../../type'

type PieDatum = {
  name: string
  value: number
}

export function Donut({
  props,
  data,
  className,
}: {
  props: Props
  data: Data
  className?: string
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  const { width, height, x, y, top, right, bottom, left } = props.layout

  const { radius, cornerRadius, padAngle } = props.series!

  const parsedData = useMemo(() => {
    const { dataset, encoding } = data
    return dataset
      .map((item) => {
        const value = Number(item[encoding.value])
        return {
          name: String(item[encoding.name] ?? ''),
          value: Number.isFinite(value) ? value : 0,
        }
      })
      .filter((item) => item.name.length > 0)
  }, [data])

  useEffect(() => {
    if (!svgRef.current) {
      return
    }

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()

    const innerWidth = Math.max(width - left - right, 0)
    const innerHeight = Math.max(height - top - bottom, 0)
    const centerX = left + innerWidth / 2
    const centerY = top + innerHeight / 2

    const g = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`)

    const resolvedOuterRadius = Math.min(innerWidth, innerHeight) / 2
    const radiusRatio = Math.max(0, Math.min(radius / 100, 1))
    const resolvedInnerRadius = resolvedOuterRadius * radiusRatio

    const arcGenerator = arc<PieArcDatum<PieDatum>>()
      .innerRadius(resolvedInnerRadius)
      .outerRadius(resolvedOuterRadius)
      .cornerRadius(cornerRadius)

    const pieData = pie<PieDatum>()
      .padAngle(padAngle)
      .value((d) => d.value)(parsedData)

    const pieWithColor = pieData.map((item, index) => ({
      ...item,
      color: interpolateRainbow(index / Math.max(pieData.length, 1)),
    }))

    const pieGroup = g
      .selectAll('g')
      .data(pieWithColor)
      .enter()
      .append('g')
      .on('mouseover', function (_, d) {
        select(this).transition().duration(250).attr('transform', calcTranslate(d, 6))
        select(this).select('path').attr('stroke', hsl(d.color).darker(1).toString())
      })
      .on('mouseout', function (_, d) {
        select(this).transition().duration(250).attr('transform', 'translate(0, 0)')
        select(this).select('path').attr('stroke', d.color)
      })

    pieGroup
      .append('path')
      .attr('d', arcGenerator)
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => d.color)
      .attr('opacity', 0.9)
    // pieGroup
    //   .append('text')
    //   .attr('transform', (d) => `translate(${arcGenerator.centroid(d)})`)
    //   .text((d) => d.data.name)
    //   .attr('text-anchor', 'middle')
    //   .attr('font-size', 12)
    //   .style('display', (d) => (d.endAngle - d.startAngle > Math.PI / 8 ? 'inline' : 'none'))
  }, [width, height, top, right, bottom, left, parsedData, radius, cornerRadius, padAngle])

  return <svg ref={svgRef} className={className} width={width} height={height}></svg>
}

function calcTranslate(d: PieArcDatum<PieDatum>, move: number) {
  const moveAngle = d.startAngle + (d.endAngle - d.startAngle) / 2
  return `translate(${-move * Math.cos(moveAngle + Math.PI / 2)}, ${-move * Math.sin(moveAngle + Math.PI / 2)})`
}

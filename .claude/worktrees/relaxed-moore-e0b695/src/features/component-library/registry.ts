import type { Meta } from './type'
import { ChartArea, ChartBar, ChartLine, ChartPie, ChartScatter, Earth, ChartNoAxesCombined } from 'lucide-react'

const categoryMap: Record<string, {
  title: string
  icon: React.ComponentType<any>
}> = {
  'bar-chart': {
    title: '柱状图',
    icon: ChartBar
  },
  'pie-chart': {
    title: '饼图',
    icon: ChartPie
  },
  'line-chart': {
    title: '折线图',
    icon: ChartLine
  },
  'area-chart': {
    title: '面积图',
    icon: ChartArea
  },
  'scatter-chart': {
    title: '散点图',
    icon: ChartScatter
  },
  'map-chart': {
    title: '地图',
    icon: Earth
  }
}

const modules = import.meta.glob(
  '../*/**/index.ts',
  { eager: true }
) as Record<string, {
  meta: Meta
  Component?: React.ComponentType<any>
}>

const chartLibrary: {
  chartMeta: {
    key: string
    title: string
    icon: React.ComponentType<any>
    children: Meta[]
  }[]
  chartComponent: Map<string, React.ComponentType<any>>
} = {
  chartMeta: [],
  chartComponent: new Map<string, React.ComponentType<any>>()
}

Object.entries(modules).reduce((acc, [path, module]) => {
  const meta = (module as any).meta as Meta
  if (!meta) return acc
  const { chartMeta, chartComponent } = acc
  if (module.Component) chartComponent.set(meta.type, module.Component)
  const key = path.match(/charts\/([^/]+)/)?.[1] ?? '其他'
  const { title, icon } = categoryMap[key] || { title: key, icon: ChartNoAxesCombined }
  const group = chartMeta.find(item => item.key === key)
  if (group) {
    group.children.push(meta)
  } else {
    chartMeta.push({ key, title, icon, children: [meta] })
  }
  return acc
}, chartLibrary)

export const getChartList = () => chartLibrary.chartMeta

export const getComponent = (type: string) => chartLibrary.chartComponent.get(type)

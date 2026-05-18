import Draggable from './draggable'
import { getChartList } from '~/features/component-library/registry'

export default function Materials() {
  const chartList = getChartList()

  return (
    <div className="w-80 p-2 shrink-0 rounded-md border border-gray-200 bg-white">
      {chartList.map((chart) => (
        <div
          className="flex flex-col gap-2 mb-2 border border-gray-200 rounded-md p-1"
          key={chart.key}
        >
          <div className="flex text-sm items-center">
            <chart.icon className="w-4 h-4 mr-1"></chart.icon>
            <span>{chart.title}</span>
          </div>
          <div className="flex gap-2">
            {chart.children.map((child) => (
              <Draggable key={child.type} meta={child}></Draggable>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

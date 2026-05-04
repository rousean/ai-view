export type Meta = {
  type: string
  title: string
  data: Data
  props: Props
  schema: Schema
}

export type Schema = Record<string, any>

// 数据
export type Data = {
  dataset: Record<string, any>[]
  encoding: Record<string, string>
}

// 样式
export type Props = {
  layout: LayoutStyle // 布局

  text?: TextStyle // 文本

  border?: BorderStyle // 边框

  shadow?: ShadowStyle // 阴影

  series?: SeriesStyle // 系列

  legend?: LegendStyle // 图例

  xAxis?: AxisStyle // X轴
  yAxis?: AxisStyle // Y轴
}

// 布局
export type LayoutStyle = {
  width: number // 宽度
  height: number // 高度
  x: number // X轴坐标
  y: number // Y轴坐标

  zIndex: number // 层级
  rotate: number // 旋转角度

  top: number // 上边距
  right: number // 右边距
  bottom: number // 下边距
  left: number // 左边距
}

type TextStyle = {
  color?: string // 颜色
  fontSize?: number // 字体大小
  fontWeight?: number // 字体粗细
  textAlign?: 'left' | 'center' | 'right' // 文本对齐方式
  textBaseline?: 'top' | 'middle' | 'bottom' // 文本基线
  letterSpacing?: number // 字母间距
  textDecoration?: 'none' | 'underline' | 'overline' | 'line-through' // 文本装饰
  writingMode?: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr' // 书写模式
}


type ShadowStyle = {
  shadowColor?: string // 阴影颜色
  shadowBlur?: number // 阴影模糊度
  shadowOffsetX?: number // 阴影偏移X
  shadowOffsetY?: number // 阴影偏移Y
}

type BorderStyle = {
  borderColor?: string // 边框颜色
  borderWidth?: number // 边框宽度
  borderStyle?: 'solid' | 'dashed' | 'dotted' // 边框样式
  borderRadius?: number // 边框圆角
  borderTopWidth?: number // 上边框宽度
  borderRightWidth?: number // 右边框宽度
  borderBottomWidth?: number // 下边框宽度
  borderLeftWidth?: number // 左边框宽度
  borderTopLeftRadius?: number // 上左边框圆角
  borderTopRightRadius?: number // 上右边框圆角
  borderBottomLeftRadius?: number // 下左边框圆角
  borderBottomRightRadius?: number // 下右边框圆角
}

export type SeriesStyle = {
  [style: string]: any // 系列样式
}

type LegendStyle = {
  show?: boolean

  orient?: 'horizontal' | 'vertical'

  position?: {
    top?: number | string
    bottom?: number | string
    left?: number | string
    right?: number | string
  }

  itemWidth?: number
  itemHeight?: number

  textStyle?: {
    color?: string
    fontSize?: number
  }
}

type AxisStyle = {
  show?: boolean

  type?: 'category' | 'value' | 'time'

  name?: string

  axisLine?: {
    show?: boolean
    lineStyle?: {
      color?: string
      width?: number
    }
  }

  axisLabel?: {
    show?: boolean
    color?: string
    fontSize?: number
    rotate?: number
  }

  splitLine?: {
    show?: boolean
    lineStyle?: {
      color?: string
      type?: 'solid' | 'dashed' | 'dotted'
    }
  }
}

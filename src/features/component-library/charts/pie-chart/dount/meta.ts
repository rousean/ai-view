import type { Props, Data, Schema, Meta } from '../../../type'

export const data: Data = {
  dataset: [
    { 语言: 'JavaScript', 使用人数: 500 },
    { 语言: 'Python', 使用人数: 200 },
    { 语言: 'Java', 使用人数: 300 },
    { 语言: 'C++', 使用人数: 400 },
    { 语言: 'C#', 使用人数: 100 }
  ],
  encoding: {
    name: '语言',
    value: '使用人数'
  }
}

export const props: Props = {
  layout: {
    width: 120,
    height: 120,
    x: 0,
    y: 0,
    zIndex: 0,
    rotate: 0,
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  },
  series: {
    radius: 80,
    cornerRadius: 10,
    padAngle: 0.01
  }
}

export const schema: Schema[] = []

export const meta: Meta = {
  title: '环形图',
  type: 'dount',
  data,
  props,
  schema,
}

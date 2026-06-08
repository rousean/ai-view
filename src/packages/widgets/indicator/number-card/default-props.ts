import type { NumberCardProps } from './types'

export const DEFAULT_NUMBER_CARD_PROPS: NumberCardProps = {
  aggregate: 'sum',
  decimals: 0,
  thousands: true,
  prefix: '',
  suffix: '',
  valueFont: { color: '#1E1E1E', size: 36, weight: 'bold' },
  showLabel: true,
  label: '指标名称',
  labelFont: { color: '#6B7280', size: 13, weight: 'normal' },
  labelPosition: 'bottom',
  align: 'center',
  background: 'transparent',
  padding: 12,
  rules: [],
}

import type { TableProps } from './types'

export const DEFAULT_TABLE_PROPS: TableProps = {
  showHeader: true,
  headerFont: { color: '#1E1E1E', size: 13, weight: 'bold' },
  headerBg: 'rgba(13,153,255,0.10)',
  cellFont: { color: '#1E1E1E', size: 12, weight: 'normal' },
  striped: true,
  stripeColor: 'rgba(0,0,0,0.03)',
  border: true,
  borderColor: 'rgba(0,0,0,0.08)',
  rowHeight: 32,
}

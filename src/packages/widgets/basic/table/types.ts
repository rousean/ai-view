import type { FontStyle } from '@designer/setters'

/** Table widget props. Validated by zod inside index.ts. */
export interface TableProps {
  showHeader: boolean
  headerFont: FontStyle
  headerBg: string
  cellFont: FontStyle
  striped: boolean
  stripeColor: string
  border: boolean
  borderColor: string
  rowHeight: number
}

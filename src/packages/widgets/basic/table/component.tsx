import * as React from 'react'
import type { WidgetRenderProps } from '../../widget-meta'
import type { TableProps } from './types'
import { DEFAULT_TABLE_PROPS } from './default-props'

function formatCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? v.toLocaleString() : ''
  return String(v)
}

/**
 * Table — renders the resolved dataset directly (`data.fields` as columns,
 * `data.rows` as rows). No slot mapping: a table shows whatever dataset is
 * inline/bound, so users edit data in the 数据 tab and the table follows.
 * Scrolls when content overflows the box.
 */
export const TableComponent: React.FC<WidgetRenderProps<TableProps>> = ({
  props: rawProps,
  data,
  layout,
}) => {
  const props = { ...DEFAULT_TABLE_PROPS, ...rawProps }
  const fields = data.fields ?? []
  const rows = data.rows ?? []
  const hf = props.headerFont ?? {}
  const cf = props.cellFont ?? {}
  const cellBorder = props.border ? `1px solid ${props.borderColor}` : 'none'

  const cellBase: React.CSSProperties = {
    height: props.rowHeight,
    padding: '0 10px',
    textAlign: 'left',
    borderBottom: cellBorder,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  return (
    <div style={{ width: layout.width, height: layout.height, overflow: 'auto', boxSizing: 'border-box' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        {props.showHeader && (
          <thead>
            <tr>
              {fields.map((f) => (
                <th
                  key={f.name}
                  style={{
                    ...cellBase,
                    background: props.headerBg,
                    color: hf.color,
                    fontSize: hf.size,
                    fontWeight: hf.weight,
                    fontStyle: hf.italic ? 'italic' : undefined,
                    position: 'sticky',
                    top: 0,
                  }}
                >
                  {f.label ?? f.name}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              style={{
                background: props.striped && ri % 2 === 1 ? props.stripeColor : undefined,
              }}
            >
              {fields.map((f) => (
                <td
                  key={f.name}
                  style={{
                    ...cellBase,
                    color: cf.color,
                    fontSize: cf.size,
                    fontWeight: cf.weight,
                    fontStyle: cf.italic ? 'italic' : undefined,
                  }}
                >
                  {formatCell(row[f.name])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

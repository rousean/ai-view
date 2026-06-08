import * as React from 'react'
import type { WidgetRenderProps } from '../../widget-meta'
import type { ClockProps } from './types'
import { DEFAULT_CLOCK_PROPS } from './default-props'

const H_ALIGN = { left: 'flex-start', center: 'center', right: 'flex-end' } as const
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const pad = (n: number) => String(n).padStart(2, '0')

function formatClock(d: Date, p: ClockProps): string {
  const parts: string[] = []
  if (p.mode !== 'time') {
    parts.push([d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join(p.dateSep))
    if (p.showWeekday) parts.push('星期' + WEEKDAYS[d.getDay()])
  }
  if (p.mode !== 'date') {
    let h = d.getHours()
    let suffix = ''
    if (!p.use24h) {
      suffix = h < 12 ? ' AM' : ' PM'
      h = h % 12 || 12
    }
    const segs = [pad(h), pad(d.getMinutes())]
    if (p.showSeconds) segs.push(pad(d.getSeconds()))
    parts.push(segs.join(':') + suffix)
  }
  return parts.join('  ')
}

/** Live clock — ticks once a second via setInterval (no rAF needed). */
export const ClockComponent: React.FC<WidgetRenderProps<ClockProps>> = ({ props: rawProps, layout }) => {
  const props = { ...DEFAULT_CLOCK_PROPS, ...rawProps }
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const f = props.font ?? {}
  return (
    <div
      style={{
        width: layout.width,
        height: layout.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: H_ALIGN[props.align] ?? 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          color: f.color,
          fontSize: f.size,
          fontWeight: f.weight,
          fontStyle: f.italic ? 'italic' : undefined,
          textAlign: props.align,
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatClock(now, props)}
      </div>
    </div>
  )
}

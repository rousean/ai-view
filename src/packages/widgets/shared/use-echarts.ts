import * as echarts from 'echarts'
import * as React from 'react'

/**
 * Hook that owns an echarts instance for the lifetime of a component.
 *
 * - mount: init() with the resolved theme name (or undefined)
 * - option change: setOption(option, true)  // notMerge=true for cleanliness
 * - size change: instance.resize()
 * - unmount: dispose()
 *
 * Caller is responsible for ensuring `option` is referentially stable
 * across renders when the underlying data hasn't changed (use useMemo
 * inside the widget component).
 */
export function useEcharts(
  option: echarts.EChartsOption,
  size: { width: number; height: number },
  themeName?: string,
  /**
   * Called when the user clicks a data item (bar / point / slice). Fires
   * only for clicks that land on a series element — not blank canvas — and
   * carries the clicked datum so the host can dispatch interactions (e.g.
   * the `filter` action reads `value` / `name`).
   */
  onDatumClick?: (detail: Record<string, unknown>) => void,
): React.RefObject<HTMLDivElement | null> {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const instanceRef = React.useRef<echarts.ECharts | null>(null)
  // Hold the latest click handler in a ref so the zrender listener is
  // registered once (on mount) and never re-bound on prop changes. The ref
  // is seeded at creation and refreshed in an effect (writing a ref during
  // render is disallowed); the listener reads `.current` at click time, by
  // which point the effect has run.
  const clickRef = React.useRef(onDatumClick)
  React.useEffect(() => {
    clickRef.current = onDatumClick
  }, [onDatumClick])

  // Mount / dispose
  React.useEffect(() => {
    if (!ref.current) return
    const instance = echarts.init(ref.current, themeName, {
      renderer: 'canvas',
    })
    instanceRef.current = instance
    instance.setOption(option, true)
    // Forward data-point clicks with the clicked datum. The native DOM
    // click still bubbles up to the host container afterwards (zrender's
    // listener sits on the canvas — the event target), so the host reads
    // the stashed detail when its own delegated click handler runs.
    instance.on('click', (params) => {
      const p = params as {
        name?: unknown
        value?: unknown
        seriesName?: unknown
        dataIndex?: unknown
      }
      clickRef.current?.({
        name: p.name,
        value: p.value,
        seriesName: p.seriesName,
        dataIndex: p.dataIndex,
      })
    })
    return () => {
      instance.dispose()
      instanceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeName])

  // Option update
  React.useEffect(() => {
    instanceRef.current?.setOption(option, true)
  }, [option])

  // Resize
  React.useEffect(() => {
    instanceRef.current?.resize({ width: size.width, height: size.height })
  }, [size.width, size.height])

  return ref
}

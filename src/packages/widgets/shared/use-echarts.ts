import * as echarts from 'echarts';
import * as React from 'react';

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
): React.RefObject<HTMLDivElement | null> {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const instanceRef = React.useRef<echarts.ECharts | null>(null);

  // Mount / dispose
  React.useEffect(() => {
    if (!ref.current) return;
    instanceRef.current = echarts.init(ref.current, themeName, {
      renderer: 'canvas',
    });
    instanceRef.current.setOption(option, true);
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeName]);

  // Option update
  React.useEffect(() => {
    instanceRef.current?.setOption(option, true);
  }, [option]);

  // Resize
  React.useEffect(() => {
    instanceRef.current?.resize({ width: size.width, height: size.height });
  }, [size.width, size.height]);

  return ref;
}

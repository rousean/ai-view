/**
 * A theme bundles design tokens and chart colors. Pages either inherit the
 * project's currentThemeId, or override via Page.themeId.
 */
export interface Theme {
  id: string
  name: string

  /**
   * CSS custom properties to inject at the page container.
   * e.g. { '--primary': '#5b8def', '--bg': '#0b1220' }
   */
  tokens: Record<string, string>

  /** Generic palette for non-ECharts widgets. */
  palette: string[]

  /** Optional ECharts theme object — passed to echarts.registerTheme. */
  echartsTheme?: Record<string, unknown>

  extensions: Record<string, unknown>
}

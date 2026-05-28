import * as React from 'react'

/**
 * Material-library thumbnail. Pure SVG, no data; carries the chart's
 * silhouette so users can recognise the type at a glance even before
 * the icon font loads.
 *
 * The colours pull from CSS custom properties (--primary / --muted-
 * foreground) so dark/light themes look right without a theme prop.
 */
export const BarChartPreview: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 56 40"
    fill="none"
    aria-hidden
    role="presentation"
  >
    {/* Y-axis baseline */}
    <line x1="6" y1="34" x2="50" y2="34" stroke="currentColor" strokeOpacity="0.25" />
    {/* Bars */}
    <rect x="9" y="22" width="6" height="12" rx="1" fill="var(--primary, #0D99FF)" />
    <rect x="19" y="14" width="6" height="20" rx="1" fill="var(--primary, #0D99FF)" />
    <rect x="29" y="18" width="6" height="16" rx="1" fill="var(--primary, #0D99FF)" />
    <rect x="39" y="26" width="6" height="8" rx="1" fill="var(--primary, #0D99FF)" />
  </svg>
)

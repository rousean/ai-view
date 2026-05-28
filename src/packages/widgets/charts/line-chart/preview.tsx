import * as React from 'react'

export const LineChartPreview: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 56 40"
    fill="none"
    aria-hidden
    role="presentation"
  >
    {/* X-axis baseline */}
    <line x1="6" y1="34" x2="50" y2="34" stroke="currentColor" strokeOpacity="0.25" />
    {/* Two-series polyline so the multi-series identity reads at a
        glance — line-chart's biggest USP over bar. */}
    <polyline
      points="8,28 16,16 24,22 32,10 40,18 48,12"
      stroke="var(--primary, #0D99FF)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <polyline
      points="8,32 16,24 24,28 32,20 40,24 48,22"
      stroke="#7C5CFF"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity="0.75"
    />
    {/* End-point markers — small but visible at 56×40 thumb size. */}
    <circle cx="48" cy="12" r="1.6" fill="var(--primary, #0D99FF)" />
    <circle cx="48" cy="22" r="1.6" fill="#7C5CFF" />
  </svg>
)

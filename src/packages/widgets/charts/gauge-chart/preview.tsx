import * as React from 'react'

/** Materials-library thumbnail — a gauge arc with a needle. */
export const GaugeChartPreview: React.FC = () => (
  <svg viewBox="0 0 56 40" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
    <path d="M13 30 A15 15 0 0 1 43 30" fill="none" stroke="currentColor" strokeWidth="3.5" strokeOpacity="0.25" strokeLinecap="round" />
    <path d="M13 30 A15 15 0 0 1 35 16.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeOpacity="0.85" strokeLinecap="round" />
    <line x1="28" y1="30" x2="34" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="28" cy="30" r="2.2" fill="currentColor" />
  </svg>
)

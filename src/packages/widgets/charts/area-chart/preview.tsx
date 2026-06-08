import * as React from 'react'

/** Materials-library thumbnail — a filled area under a curve. */
export const AreaChartPreview: React.FC = () => (
  <svg viewBox="0 0 56 40" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
    <path d="M10 30 L20 20 L28 25 L38 13 L46 19 L46 31 L10 31 Z" fill="currentColor" fillOpacity="0.35" />
    <path d="M10 30 L20 20 L28 25 L38 13 L46 19" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.8" />
  </svg>
)

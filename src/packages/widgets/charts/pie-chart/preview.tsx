import * as React from 'react'

/** Materials-library thumbnail — a solid pie split into slices. */
export const PieChartPreview: React.FC = () => (
  <svg viewBox="0 0 56 40" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
    <circle cx="28" cy="20" r="13" fill="currentColor" fillOpacity="0.25" />
    <path d="M28 20 L28 7 A13 13 0 0 1 41 20 Z" fill="currentColor" fillOpacity="0.75" />
    <path d="M28 20 L41 20 A13 13 0 0 1 31 32.6 Z" fill="currentColor" fillOpacity="0.5" />
  </svg>
)

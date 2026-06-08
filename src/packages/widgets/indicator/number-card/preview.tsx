import * as React from 'react'

/** Materials-library thumbnail — a big number over a small label bar. */
export const NumberCardPreview: React.FC = () => (
  <svg viewBox="0 0 56 40" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
    <text
      x="28"
      y="23"
      textAnchor="middle"
      fontSize="17"
      fontWeight="700"
      fill="currentColor"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      88
    </text>
    <rect x="20" y="28" width="16" height="3" rx="1.5" fill="currentColor" fillOpacity="0.45" />
  </svg>
)

import * as React from 'react'

/** Materials-library thumbnail — three paragraph bars suggesting a text block. */
export const TextPreview: React.FC = () => (
  <svg viewBox="0 0 56 40" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
    <rect x="11" y="12" width="34" height="4" rx="2" fill="currentColor" fillOpacity="0.85" />
    <rect x="11" y="20" width="26" height="3.5" rx="1.75" fill="currentColor" fillOpacity="0.5" />
    <rect x="11" y="27" width="30" height="3.5" rx="1.75" fill="currentColor" fillOpacity="0.5" />
  </svg>
)

import * as React from 'react'

/** Materials-library thumbnail — a small table grid with a header row. */
export const TablePreview: React.FC = () => (
  <svg viewBox="0 0 56 40" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
    <rect x="9" y="10" width="38" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
    <rect x="9.5" y="10.5" width="37" height="6" fill="currentColor" fillOpacity="0.5" />
    <line x1="22" y1="10" x2="22" y2="30" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="34" y1="10" x2="34" y2="30" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="9" y1="22" x2="47" y2="22" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
  </svg>
)

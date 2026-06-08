import * as React from 'react'

/** Materials-library thumbnail — a clock face. */
export const ClockPreview: React.FC = () => (
  <svg viewBox="0 0 56 40" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
    <circle cx="28" cy="20" r="11" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.8" />
    <line x1="28" y1="20" x2="28" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="28" y1="20" x2="33" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

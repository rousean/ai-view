import * as React from 'react'

/** Materials-library thumbnail — a framed photo glyph. */
export const ImagePreview: React.FC = () => (
  <svg viewBox="0 0 56 40" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
    <rect x="11" y="9" width="34" height="22" rx="3" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.7" />
    <circle cx="19" cy="16" r="2.5" fill="currentColor" fillOpacity="0.7" />
    <path d="M13 29 L23 20 L30 26 L37 20 L43 29 Z" fill="currentColor" fillOpacity="0.5" />
  </svg>
)

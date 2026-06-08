import * as React from 'react'

/** Materials-library thumbnail — a frame with corner brackets. */
export const FramePreview: React.FC = () => (
  <svg viewBox="0 0 56 40" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
    <rect x="9" y="9" width="38" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35" />
    {['16,9 9,9 9,16', '40,9 47,9 47,16', '47,24 47,31 40,31', '9,24 9,31 16,31'].map((p, i) => (
      <polyline key={i} points={p} fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.9" />
    ))}
  </svg>
)

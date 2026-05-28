import * as React from 'react'

export const DonutChartPreview: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 56 40"
    fill="none"
    aria-hidden
    role="presentation"
  >
    {/* Donut composed of three arcs + the inner hole. Stroke-based
        construction keeps it crisp at any zoom and reads as "ring"
        even at thumbnail size. */}
    <g transform="translate(28 20)">
      <circle cx="0" cy="0" r="11" stroke="var(--primary, #0D99FF)" strokeWidth="5" />
      <path d="M 0 -11 A 11 11 0 0 1 9.5 5.5" stroke="#7C5CFF" strokeWidth="5" fill="none" />
      <path
        d="M 9.5 5.5 A 11 11 0 0 1 -5.5 9.5"
        stroke="#FFB020"
        strokeWidth="5"
        fill="none"
      />
    </g>
  </svg>
)

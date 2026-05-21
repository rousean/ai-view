/**
 * Decorative 320×180 thumbnail for the screens list — three small tiles +
 * a trending line. Single SVG; six themed colour pairs.
 */
const THEMES = {
  cyan: { bg: '#0a1929', color: '#00d4ff' },
  purple: { bg: '#1a0d2e', color: '#a855f7' },
  green: { bg: '#0a1f1a', color: '#14d96b' },
  amber: { bg: '#1f1408', color: '#fbbf24' },
  blue: { bg: '#0d1430', color: '#409eff' },
  crimson: { bg: '#2a0d1a', color: '#ff5edd' },
} as const

export type MiniThumbTheme = keyof typeof THEMES

export function MiniThumb({ theme }: { theme: MiniThumbTheme }) {
  const t = THEMES[theme]
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="block h-full w-full">
      <rect width="320" height="180" fill={t.bg} />
      <rect x="20" y="30" width="60" height="20" fill={t.color} fillOpacity="0.2" />
      <rect x="90" y="30" width="60" height="20" fill={t.color} fillOpacity="0.2" />
      <rect x="160" y="30" width="60" height="20" fill={t.color} fillOpacity="0.2" />
      <polyline
        points="20,140 60,110 100,125 140,80 180,95 220,60"
        fill="none"
        stroke={t.color}
        strokeWidth="3"
      />
    </svg>
  )
}

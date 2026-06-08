import type { Background } from '@schema/types'
import type { ProjectPalette } from './palette-types'

/**
 * Built-in palette templates ("配色方案"). Applying one *replaces* the
 * project palette as a one-off action (optionally re-skinning existing
 * widgets) and — when the template carries a `background` — also sets the
 * page's canvas background, so a dark theme actually reads as a dark 大屏
 * instead of dark widgets on a white plate.
 *
 * After application the project owns the palette outright; no "currently
 * selected theme" state is kept.
 */
export interface PaletteTemplate {
  id: string
  name: string
  /** Backdrop colour used by the swatch chip — usually equals canvas. */
  swatch: [string, string, string]
  /** The full palette to apply when this template is picked. */
  palette: ProjectPalette
  /** Optional canvas background applied alongside the palette. */
  background?: Background
}

export const BUILTIN_PALETTE_TEMPLATES: PaletteTemplate[] = [
  {
    id: 'business-light',
    name: '商务亮',
    swatch: ['#FFFFFF', '#0D99FF', '#1E1E1E'],
    background: { type: 'color', color: '#F5F7FA' },
    palette: {
      primary: '#0D99FF',
      secondary: '#7C5CFF',
      text: '#1E1E1E',
      muted: '#5B5B5B',
      axis: '#9CA3AF',
      grid: '#E5E7EB',
      series: ['#0D99FF', '#00C49A', '#FFB020', '#FF5E62', '#7C5CFF', '#22C55E'],
      templateId: 'business-light',
    },
  },
  {
    id: 'deep-space',
    name: '深空',
    swatch: ['#0B1326', '#00D4FF', '#FFFFFF'],
    background: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 135,
        stops: [
          { offset: 0, color: '#0A1228' },
          { offset: 1, color: '#0E2546' },
        ],
      },
    },
    palette: {
      primary: '#00D4FF',
      secondary: '#7C5CFF',
      text: '#F8FAFC',
      muted: '#94A3B8',
      axis: '#475569',
      grid: '#1E293B',
      series: ['#00D4FF', '#7C5CFF', '#FF5EDD', '#FFD93D', '#14AE5C', '#0D99FF'],
      templateId: 'deep-space',
    },
  },
  {
    id: 'cyber-neon',
    name: '霓虹紫',
    swatch: ['#15102B', '#B388FF', '#FF5EDD'],
    background: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 135,
        stops: [
          { offset: 0, color: '#140C2E' },
          { offset: 1, color: '#241248' },
        ],
      },
    },
    palette: {
      primary: '#B388FF',
      secondary: '#FF5EDD',
      text: '#F4F0FF',
      muted: '#A99CD1',
      axis: '#5B4F8F',
      grid: '#28204F',
      series: ['#B388FF', '#FF5EDD', '#00D4FF', '#FFD93D', '#FF8A65', '#7DD3FC'],
      templateId: 'cyber-neon',
    },
  },
  {
    id: 'sunset-warm',
    name: '暖橙夕阳',
    swatch: ['#FFF6EE', '#FF7A45', '#262626'],
    background: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 135,
        stops: [
          { offset: 0, color: '#FFF3E8' },
          { offset: 1, color: '#FFE3CC' },
        ],
      },
    },
    palette: {
      primary: '#FF7A45',
      secondary: '#FFC53D',
      text: '#262626',
      muted: '#7C6B5C',
      axis: '#C29B7A',
      grid: '#F1E0CD',
      series: ['#FF7A45', '#FFC53D', '#73D13D', '#36CFC9', '#9254DE', '#F759AB'],
      templateId: 'sunset-warm',
    },
  },
  {
    id: 'mono',
    name: '极简灰',
    swatch: ['#FAFAFA', '#374151', '#9CA3AF'],
    background: { type: 'color', color: '#F7F8FA' },
    palette: {
      primary: '#374151',
      secondary: '#6B7280',
      text: '#111827',
      muted: '#6B7280',
      axis: '#9CA3AF',
      grid: '#E5E7EB',
      series: ['#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#111827', '#4B5563'],
      templateId: 'mono',
    },
  },
]

export function findPaletteTemplate(id: string | undefined): PaletteTemplate | undefined {
  if (!id) return undefined
  return BUILTIN_PALETTE_TEMPLATES.find((t) => t.id === id)
}

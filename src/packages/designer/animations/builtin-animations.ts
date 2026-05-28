import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Maximize2,
  RotateCw,
  Sparkles,
} from 'lucide-react'
import type { EasingDef, EnterAnimationDef } from './animation-types'

/**
 * Built-in enter animation catalogue. Each one maps to a CSS class
 * declared in `animations.css`; the class produces the named keyframe
 * via the `--ai-view-enter` custom property reading `animation: var(...)`.
 *
 * Authors add new ones by extending this list AND adding a matching
 * keyframe block. We deliberately don't auto-derive — keeping the CSS
 * hand-maintained means we can fine-tune feel (a `slideUp` that starts
 * from `translate(0, 12px)` doesn't look the same as one starting
 * `translate(0, 100%)`, and we want the curated version).
 */
export const BUILTIN_ENTER_ANIMATIONS: EnterAnimationDef[] = [
  { type: 'fade', label: '淡入', icon: Sparkles, description: '不透明度从 0 → 1' },
  {
    type: 'slideUp',
    label: '向上滑入',
    icon: ArrowUp,
    description: '从下方向上滑入并淡入',
  },
  {
    type: 'slideDown',
    label: '向下滑入',
    icon: ArrowDown,
    description: '从上方向下滑入并淡入',
  },
  {
    type: 'slideLeft',
    label: '向左滑入',
    icon: ArrowLeft,
    description: '从右侧向左滑入并淡入',
  },
  {
    type: 'slideRight',
    label: '向右滑入',
    icon: ArrowRight,
    description: '从左侧向右滑入并淡入',
  },
  {
    type: 'scale',
    label: '缩放放大',
    icon: Maximize2,
    description: '从 0.8 缩放到 1.0 并淡入',
  },
  {
    type: 'rotateIn',
    label: '旋转入场',
    icon: RotateCw,
    description: '轻微旋转 + 缩放 + 淡入',
  },
]

/** CSS timing-function options. Custom cubic-bezier is reserved for later. */
export const BUILTIN_EASINGS: EasingDef[] = [
  { value: 'linear', label: 'Linear · 匀速' },
  { value: 'ease', label: 'Ease · 默认' },
  { value: 'ease-in', label: 'Ease-In · 慢起' },
  { value: 'ease-out', label: 'Ease-Out · 慢止' },
  { value: 'ease-in-out', label: 'Ease-In-Out · 慢起慢止' },
  { value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', label: 'Bounce · 弹性' },
  { value: 'cubic-bezier(0.16, 1, 0.3, 1)', label: 'Smooth · 平滑' },
]

export function findEnterAnimation(type: string | undefined): EnterAnimationDef | undefined {
  if (!type) return undefined
  return BUILTIN_ENTER_ANIMATIONS.find((a) => a.type === type)
}

export function findEasing(value: string | undefined): EasingDef | undefined {
  if (!value) return undefined
  return BUILTIN_EASINGS.find((e) => e.value === value)
}

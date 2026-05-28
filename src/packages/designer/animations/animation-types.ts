import type { LucideIcon } from 'lucide-react'

/**
 * Animation registry — what enter animations the designer supports.
 *
 * Each entry maps to a CSS keyframe block that ships in the canvas
 * runtime stylesheet. Picking an entry stores only its `type` on the
 * widget; the actual keyframes are evaluated by class injection on the
 * widget container.
 *
 * Why not free-form CSS? Two reasons:
 *   1. The renderer ships the same set, so authoring "designed-only"
 *      animations leak into runtime. We want WYSIWYG.
 *   2. AnimationConfig is in the JSON schema and roundtrips through
 *      file save/load. Closed enum = safe migration.
 */
export interface EnterAnimationDef {
  /** Registry key — stored on widget.animation.enter.type. */
  type: string
  label: string
  description?: string
  icon: LucideIcon
}

export interface EasingDef {
  /** CSS timing function (e.g. `ease-out`, `cubic-bezier(.2,.8,.2,1)`). */
  value: string
  label: string
}

/** Default values for a fresh enter-animation block. */
export interface AnimationDefaults {
  duration: number
  delay: number
  easing: string
}

export const DEFAULT_ENTER_ANIMATION: AnimationDefaults = {
  duration: 600,
  delay: 0,
  easing: 'ease-out',
}

export const DEFAULT_UPDATE_ANIMATION: AnimationDefaults = {
  duration: 400,
  delay: 0,
  easing: 'ease-in-out',
}

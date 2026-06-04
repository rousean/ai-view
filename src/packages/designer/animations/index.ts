// Animations moved to @renderer (the runtime ships the same set, so preview
// and published output match design-time). Re-exported here — including the
// keyframe CSS side-effect via the `@renderer/animations` barrel — so the
// existing `../animations` imports keep working unchanged.
export type { EnterAnimationDef, EasingDef, AnimationDefaults } from '@renderer/animations'
export {
  DEFAULT_ENTER_ANIMATION,
  DEFAULT_UPDATE_ANIMATION,
  BUILTIN_ENTER_ANIMATIONS,
  BUILTIN_EASINGS,
  findEnterAnimation,
  findEasing,
} from '@renderer/animations'

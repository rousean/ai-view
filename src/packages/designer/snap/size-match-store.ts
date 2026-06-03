import { create } from 'zustand'

/**
 * A single "equal size" marker line drawn during a size-snap. Two are
 * emitted per matched axis: one on the moving widget, one on the sibling
 * it matched — equal lengths read as "these two are the same size".
 */
export interface SizeMatchSegment {
  /** `h` = horizontal line (width match); `v` = vertical (height match). */
  orientation: 'h' | 'v'
  x1: number
  y1: number
  x2: number
  y2: number
}

interface SizeMatchState {
  segments: SizeMatchSegment[]
  set: (segments: SizeMatchSegment[]) => void
  clear: () => void
}

/**
 * Transient store for the size-snap "equal size" markers. Separate from
 * the alignment-guide store (different visual, different lifecycle) and
 * from EditorStore (written at 60fps during a resize).
 */
export const useSizeMatchStore = create<SizeMatchState>((set) => ({
  segments: [],
  set: (segments) => set({ segments }),
  clear: () => set({ segments: [] }),
}))

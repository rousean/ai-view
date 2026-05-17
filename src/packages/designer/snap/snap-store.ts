import { create } from 'zustand';
import type { ActiveSnapGuide } from './types';

/**
 * Tiny store dedicated to the transient alignment guides shown during
 * a drag / resize gesture. Kept separate from EditorStore because:
 *   - writes happen at 60fps during a gesture (high frequency);
 *   - readers are very narrow (only the overlay component cares),
 *     so we don't want this churn waking up unrelated subscribers.
 */
interface SnapGuidesState {
  guides: ActiveSnapGuide[];
  set: (guides: ActiveSnapGuide[]) => void;
  clear: () => void;
}

export const useSnapGuidesStore = create<SnapGuidesState>((set) => ({
  guides: [],
  set: (guides) => set({ guides }),
  clear: () => set({ guides: [] }),
}));

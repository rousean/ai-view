import * as React from 'react';
import type { Layout, WidgetNode } from '@schema/types';
import { useDashboardEditor } from '../../editor/editor-context';
import {
  type BBox,
  type ResizeHandle,
  distributeResize,
  resizeBBox,
  unionBBox,
} from '../transformer/geometry';

interface ResizeSession {
  handle: ResizeHandle;
  pointerStart: { x: number; y: number };
  startBBox: BBox;
  initial: WidgetNode[];
}

/**
 * Hook returning a `start(handle, pointerEvent)` function that begins a
 * resize gesture on the current selection. The gesture handles
 * pointer move / up internally and commits via editor.updateLayoutBatch.
 *
 * Shift = lock aspect ratio. Alt = scale from center.
 */
export function useResizeGesture(): (
  handle: ResizeHandle,
  e: React.PointerEvent,
) => void {
  const editor = useDashboardEditor();
  const sessionRef = React.useRef<ResizeSession | null>(null);

  const onMove = React.useCallback(
    (ev: PointerEvent) => {
      const s = sessionRef.current;
      if (!s) return;
      const scale = editor.getCamera().scale;
      const dx = (ev.clientX - s.pointerStart.x) / scale;
      const dy = (ev.clientY - s.pointerStart.y) / scale;

      const newBBox = resizeBBox(s.startBBox, s.handle, dx, dy, {
        lockAspect: ev.shiftKey,
        fromCenter: ev.altKey,
      });

      const updates = distributeResize(s.initial, s.startBBox, newBBox);
      editor.updateLayoutBatch(
        updates as Array<{ id: string; layout: Partial<Layout> }>,
      );
    },
    [editor],
  );

  const onUp = React.useCallback(() => {
    sessionRef.current = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  }, [onMove]);

  return React.useCallback(
    (handle: ResizeHandle, e: React.PointerEvent) => {
      const initial = editor.getSelectedWidgets();
      if (initial.length === 0) return;
      const startBBox = unionBBox(initial);
      if (!startBBox) return;

      sessionRef.current = {
        handle,
        pointerStart: { x: e.clientX, y: e.clientY },
        startBBox,
        // Snapshot initial layouts; we re-derive from these every move.
        initial: initial.map((w) => structuredClone(w)),
      };
      // Mark a single history breakpoint at gesture start; subsequent
      // updateLayoutBatch calls coalesce via mergeKey.
      editor.mark('Resize widgets');

      // stop bubbling so SelectTool doesn't see this.
      e.stopPropagation();
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [editor, onMove, onUp],
  );
}

import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDocumentStore } from '../../stores/document-store';
import { useEditorStore } from '../../stores/editor-store';
import { selectWidget, selectWidgets } from '../../stores/selectors';

/** Computes the union AABB of selected widgets (in canvas space). */
function useSelectionBounds() {
  const ids = useEditorStore(useShallow((s) => s.selectedIds));
  const widgets = useDocumentStore(
    useShallow((s) => {
      if (ids.length === 1) {
        const w = selectWidget(ids[0])(s);
        return w ? [w] : [];
      }
      const all = selectWidgets(s);
      const set = new Set(ids);
      return all.filter((w) => set.has(w.id));
    }),
  );
  if (widgets.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of widgets) {
    minX = Math.min(minX, w.layout.x);
    minY = Math.min(minY, w.layout.y);
    maxX = Math.max(maxX, w.layout.x + w.layout.width);
    maxY = Math.max(maxY, w.layout.y + w.layout.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Overlay outline around the current selection. Sits in the camera-transformed
 * layer so it scales with widgets (line stays 1px screen by counter-scaling).
 */
export const SelectionBounds: React.FC = () => {
  const bounds = useSelectionBounds();
  const scale = useEditorStore((s) => s.camera.scale);
  if (!bounds) return null;
  const stroke = Math.max(1 / scale, 0.5);

  return (
    <div
      style={{
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        outline: `${stroke}px solid #5b8def`,
        outlineOffset: `-${stroke}px`,
        pointerEvents: 'none',
      }}
    />
  );
};

/** Single-selection hover indicator. Renders only when not selected. */
export const HoverIndicator: React.FC = () => {
  const hoverId = useEditorStore((s) => s.hoverId);
  const isSelected = useEditorStore((s) =>
    hoverId ? s.selectedIds.includes(hoverId) : false,
  );
  const widget = useDocumentStore((s) =>
    hoverId ? selectWidget(hoverId)(s) ?? null : null,
  );
  const scale = useEditorStore((s) => s.camera.scale);
  if (!widget || isSelected) return null;
  const stroke = Math.max(1 / scale, 0.5);
  return (
    <div
      style={{
        position: 'absolute',
        left: widget.layout.x,
        top: widget.layout.y,
        width: widget.layout.width,
        height: widget.layout.height,
        outline: `${stroke}px dashed rgba(91,141,239,0.6)`,
        outlineOffset: `-${stroke}px`,
        pointerEvents: 'none',
      }}
    />
  );
};

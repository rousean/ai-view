import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDocumentStore } from '../../stores/document-store';
import { useEditorStore } from '../../stores/editor-store';
import { selectWidget, selectWidgets } from '../../stores/selectors';
import { unionBBox } from '../transformer/geometry';
import { ResizeHandles } from './resize-handles';
import { RotationHandle } from './rotation-handle';

interface SelectionBBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Chrome rotation (only set when count === 1, otherwise 0). */
  rotate: number;
  count: number;
}

/**
 * Compute the bbox to draw the selection chrome at.
 *
 * Single selection: the chrome rotates with the widget (`transform: rotate`
 * applied at render). So we return the *un-rotated* layout rect plus the
 * widget's rotation — the CSS transform will orient the chrome correctly.
 *
 * Multi-selection: the chrome stays axis-aligned. We must enclose every
 * selected widget's *visual* extent — which for rotated widgets means
 * using rotatedAABB, not the raw layout. unionBBox already handles this.
 */
function useSelectionBBox(): SelectionBBox | null {
  const ids = useEditorStore(useShallow((s) => s.selectedIds));
  const widgets = useDocumentStore(
    useShallow((s) => {
      if (ids.length === 0) return [];
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

  if (widgets.length === 1) {
    const w = widgets[0];
    return {
      x: w.layout.x,
      y: w.layout.y,
      width: w.layout.width,
      height: w.layout.height,
      rotate: w.layout.rotate,
      count: 1,
    };
  }

  const bb = unionBBox(widgets);
  if (!bb) return null;
  return { ...bb, rotate: 0, count: widgets.length };
}

/**
 * Selection chrome: outline + 8 resize handles + 1 rotation handle.
 *
 * For multi-selection, the bbox is the AABB and rotation is shown as 0;
 * the rotation gesture rotates each member around the group center.
 *
 * The chrome itself is rendered inside the camera-transformed layer, so
 * stroke widths are counter-scaled to stay 1px on screen.
 */
export const SelectionBounds: React.FC = () => {
  const bbox = useSelectionBBox();
  const scale = useEditorStore((s) => s.camera.scale);
  const interaction = useEditorStore((s) => s.interaction.kind);
  if (!bbox) return null;

  const stroke = Math.max(1 / scale, 0.5);
  const isMarquee = interaction === 'marquee';

  return (
    <div
      style={{
        position: 'absolute',
        left: bbox.x,
        top: bbox.y,
        width: bbox.width,
        height: bbox.height,
        // Single-element selection: rotate the chrome to match the widget.
        // Multi-selection always uses the AABB (rotate = 0).
        transform: bbox.count === 1 && bbox.rotate ? `rotate(${bbox.rotate}deg)` : undefined,
        transformOrigin: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          outline: `${stroke}px solid var(--selection-color, #5b8def)`,
          outlineOffset: `-${stroke}px`,
          pointerEvents: 'none',
        }}
      />
      {!isMarquee && (
        <>
          <RotationHandle
            bbox={{ x: 0, y: 0, width: bbox.width, height: bbox.height }}
          />
          <ResizeHandles
            bbox={{ x: 0, y: 0, width: bbox.width, height: bbox.height }}
            rotation={bbox.count === 1 ? bbox.rotate : 0}
          />
        </>
      )}
    </div>
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
        outline: `${stroke}px dashed var(--hover-color, rgba(91,141,239,0.6))`,
        outlineOffset: `-${stroke}px`,
        transform: widget.layout.rotate ? `rotate(${widget.layout.rotate}deg)` : undefined,
        transformOrigin: 'center',
        pointerEvents: 'none',
      }}
    />
  );
};

import { MousePointer2 } from 'lucide-react';
import { rotatedAABB } from '../canvas/transformer/geometry';
import type { Tool, ToolContext } from './tool.interface';

interface SelectState {
  phase: 'idle' | 'pre-move' | 'moving' | 'marquee' | 'pre-click';
  pointerStart?: { x: number; y: number };
  canvasStart?: { x: number; y: number };
  movingIds?: string[];
  initialLayouts?: Map<string, { x: number; y: number }>;
  marqueeOrigin?: { x: number; y: number };
  hitWidgetId?: string;
}

const MOVE_THRESHOLD = 4; // px in screen space

function getState(ctx: ToolContext): SelectState {
  return ctx.state as unknown as SelectState;
}

function findHitWidgetId(target: EventTarget | null): string | null {
  let el = target as HTMLElement | null;
  while (el && el !== document.body) {
    const id = el.dataset?.widgetId;
    if (id) return id;
    el = el.parentElement;
  }
  return null;
}

export const SelectTool: Tool = {
  type: 'select',
  label: '选择',
  shortcut: 'V',
  icon: MousePointer2 as Tool['icon'],

  onActivate(ctx) {
    Object.assign(ctx.state, { phase: 'idle' } satisfies SelectState);
  },

  onPointerDown(e, ctx) {
    const editor = ctx.editor;
    const s = getState(ctx);
    const widgetId = findHitWidgetId(e.target);
    s.pointerStart = { x: e.clientX, y: e.clientY };
    s.canvasStart = ctx.pointer.canvas;

    if (widgetId) {
      // Hit a widget — prepare to move it (and everything else selected).
      const isAlreadySelected = editor.getSelectedIds().includes(widgetId);
      if (!isAlreadySelected) {
        if (e.shiftKey || e.ctrlKey || e.metaKey) editor.selectOne(widgetId, { addToSelection: true });
        else editor.selectOne(widgetId);
      }
      s.hitWidgetId = widgetId;
      s.phase = 'pre-move';
      const ids = editor.getSelectedIds();
      const initialLayouts = new Map<string, { x: number; y: number }>();
      for (const id of ids) {
        const w = editor.getWidget(id);
        if (w) initialLayouts.set(id, { x: w.layout.x, y: w.layout.y });
      }
      s.movingIds = ids;
      s.initialLayouts = initialLayouts;
      editor.mark('Move widgets');
    } else {
      // Empty canvas click → marquee or clear selection.
      if (!(e.shiftKey || e.ctrlKey || e.metaKey)) editor.selectNone();
      s.phase = 'marquee';
      s.marqueeOrigin = ctx.pointer.canvas;
    }

    (e.target as Element).setPointerCapture?.(e.pointerId);
  },

  onPointerMove(e, ctx) {
    const editor = ctx.editor;
    const s = getState(ctx);
    if (s.phase === 'idle') return;

    if (s.phase === 'pre-move' || s.phase === 'moving') {
      if (!s.pointerStart) return;
      const dx = e.clientX - s.pointerStart.x;
      const dy = e.clientY - s.pointerStart.y;
      if (
        s.phase === 'pre-move' &&
        Math.hypot(dx, dy) < MOVE_THRESHOLD
      ) {
        return;
      }
      s.phase = 'moving';

      // Convert delta from screen → canvas.
      const scale = editor.getCamera().scale;
      const cdx = dx / scale;
      const cdy = dy / scale;

      const updates = (s.movingIds ?? []).map((id) => {
        const init = s.initialLayouts?.get(id);
        return {
          id,
          layout: {
            x: (init?.x ?? 0) + cdx,
            y: (init?.y ?? 0) + cdy,
          },
        };
      });
      editor.updateLayoutBatch(updates);
    } else if (s.phase === 'marquee') {
      if (!s.marqueeOrigin) return;
      const a = s.marqueeOrigin;
      const b = ctx.pointer.canvas;
      const rect = {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y),
      };
      editor.bus.emit('plugin.marquee.update', rect);
    }
  },

  onPointerUp(_e, ctx) {
    const editor = ctx.editor;
    const s = getState(ctx);
    if (s.phase === 'marquee') {
      // Commit selection from marquee.
      const a = s.marqueeOrigin;
      const b = ctx.pointer.canvas;
      if (a) {
        const rect = {
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          width: Math.abs(b.x - a.x),
          height: Math.abs(b.y - a.y),
        };
        if (rect.width > 4 && rect.height > 4) {
          // Hit-test against the rotated AABB so rotated widgets are
          // selectable by the marquee that visually overlaps them.
          const hits = editor.getAllWidgets().filter((w) => {
            const aabb = rotatedAABB(w);
            return (
              aabb.x + aabb.width >= rect.x &&
              aabb.x <= rect.x + rect.width &&
              aabb.y + aabb.height >= rect.y &&
              aabb.y <= rect.y + rect.height
            );
          });
          editor.select(hits.map((w) => w.id));
        }
      }
      editor.bus.emit('plugin.marquee.update', null);
    }
    Object.assign(ctx.state, { phase: 'idle' } satisfies SelectState);
  },

  onKeyDown(e, ctx) {
    const editor = ctx.editor;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids = editor.getSelectedIds();
      if (ids.length > 0) editor.removeWidgets(ids);
    } else if (e.key === 'Escape') {
      editor.selectNone();
    } else if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      editor.selectAll();
    }
  },
};

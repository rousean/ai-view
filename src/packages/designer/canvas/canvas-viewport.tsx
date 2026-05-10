import * as React from 'react';
import {
  useDashboardEditor,
  useEditorState,
} from '../editor/editor-context';
import type { Tool, ToolContext } from '../tools/tool.interface';
import { CameraTransformLayer } from './camera-transform-layer';
import { GridLayer } from './grid-layer';
import { MarqueeOverlay } from './overlay/marquee';
import {
  HoverIndicator,
  SelectionBounds,
} from './overlay/selection-bounds';
import { PageBackgroundWithAssets } from './page-background';
import { WidgetLayer } from './widget-layer';

/**
 * Top-level canvas component. Captures pointer/wheel/keyboard events,
 * resolves the current tool from the registry, and dispatches to it.
 *
 * Children (PageBackground, GridLayer, WidgetLayer, overlays) live inside
 * the camera-transformed layer so they share one CSS transform.
 */
export const CanvasViewport: React.FC<{ className?: string }> = ({
  className,
}) => {
  const editor = useDashboardEditor();
  const tool = useEditorState((s) => s.tool);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Per-tool persistent scratch state, keyed by tool id.
  const toolStatesRef = React.useRef<Map<string, Record<string, unknown>>>(
    new Map(),
  );

  const getToolContext = React.useCallback(
    (e: PointerEvent | WheelEvent | KeyboardEvent): ToolContext | null => {
      const rect = containerRef.current?.getBoundingClientRect();
      const screen =
        'clientX' in e
          ? { x: e.clientX, y: e.clientY }
          : { x: 0, y: 0 };
      const canvas = editor.screenToCanvas(screen, {
        left: rect?.left ?? 0,
        top: rect?.top ?? 0,
      });
      let toolState = toolStatesRef.current.get(tool);
      if (!toolState) {
        toolState = {};
        toolStatesRef.current.set(tool, toolState);
      }
      return {
        editor,
        state: toolState,
        pointer: { screen, canvas },
      };
    },
    [editor, tool],
  );

  const getActiveTool = React.useCallback((): Tool | undefined => {
    return editor.registry.tools.get(tool);
  }, [editor, tool]);

  // Activate / deactivate tools when the active id changes.
  const prevToolRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const prevId = prevToolRef.current;
    if (prevId && prevId !== tool) {
      const prev = editor.registry.tools.get(prevId);
      const prevState = toolStatesRef.current.get(prevId);
      if (prev?.onDeactivate && prevState) {
        prev.onDeactivate({
          editor,
          state: prevState,
          pointer: { screen: { x: 0, y: 0 }, canvas: { x: 0, y: 0 } },
        });
      }
    }
    const cur = editor.registry.tools.get(tool);
    let curState = toolStatesRef.current.get(tool);
    if (!curState) {
      curState = {};
      toolStatesRef.current.set(tool, curState);
    }
    if (cur?.onActivate) {
      cur.onActivate({
        editor,
        state: curState,
        pointer: { screen: { x: 0, y: 0 }, canvas: { x: 0, y: 0 } },
      });
    }
    prevToolRef.current = tool;
  }, [editor, tool]);

  // ── Event handlers ─────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    const t = getActiveTool();
    if (!t?.onPointerDown) return;
    const ctx = getToolContext(e.nativeEvent);
    if (ctx) t.onPointerDown(e.nativeEvent, ctx);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Hover detection
    const targetEl = e.target as HTMLElement;
    let el: HTMLElement | null = targetEl;
    let hitId: string | null = null;
    while (el && el !== containerRef.current) {
      const id = el.dataset?.widgetId;
      if (id) {
        hitId = id;
        break;
      }
      el = el.parentElement;
    }
    editor.setHover(hitId);

    const t = getActiveTool();
    if (!t?.onPointerMove) return;
    const ctx = getToolContext(e.nativeEvent);
    if (ctx) t.onPointerMove(e.nativeEvent, ctx);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const t = getActiveTool();
    if (!t?.onPointerUp) return;
    const ctx = getToolContext(e.nativeEvent);
    if (ctx) t.onPointerUp(e.nativeEvent, ctx);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Default: zoom around cursor (Ctrl/Cmd to zoom, otherwise pan).
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      const anchor = {
        x: e.clientX - (rect?.left ?? 0),
        y: e.clientY - (rect?.top ?? 0),
      };
      editor.zoomBy(-e.deltaY * 0.002, anchor);
    } else {
      editor.panBy(-e.deltaX, -e.deltaY);
    }
    const t = getActiveTool();
    if (t?.onWheel) {
      const ctx = getToolContext(e.nativeEvent);
      if (ctx) t.onWheel(e.nativeEvent, ctx);
    }
  };

  // Keyboard events (attached to window when canvas focused)
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Standard editor shortcuts at the viewport level.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        editor.redo();
        return;
      }

      const t = getActiveTool();
      if (!t?.onKeyDown) return;
      const ctx = getToolContext(e);
      if (ctx) t.onKeyDown(e, ctx);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const t = getActiveTool();
      if (!t?.onKeyUp) return;
      const ctx = getToolContext(e);
      if (ctx) t.onKeyUp(e, ctx);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [editor, getActiveTool, getToolContext]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0e1422',
        cursor: getActiveTool()?.cursor as string | undefined,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    >
      <CameraTransformLayer>
        <PageBackgroundWithAssets />
        <GridLayer />
        <WidgetLayer />
        <HoverIndicator />
        <SelectionBounds />
        <MarqueeOverlay />
      </CameraTransformLayer>
    </div>
  );
};

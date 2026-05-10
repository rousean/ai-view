import { PlusSquare } from 'lucide-react';
import type { WidgetMeta } from '@widgets/widget-meta';
import { useEditorStore } from '../stores/editor-store';
import type { Tool } from './tool.interface';

/**
 * Place tool — first pointer-up on the canvas drops a widget of the type
 * stored in `editorStore.toolContext.widgetType`. After dropping, returns
 * to SelectTool unless `toolLocked` is set.
 *
 * Usage: `editor.setTool('place', { widgetType: 'bar-chart' })`.
 */
export const PlaceTool: Tool = {
  type: 'place',
  label: '放置',
  icon: PlusSquare as Tool['icon'],
  cursor: 'crosshair',

  onPointerDown(e) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
  },

  onPointerUp(_e, ctx) {
    const editor = ctx.editor;
    const { toolContext, toolLocked } = useEditorStore.getState();
    const widgetType = (toolContext as { widgetType?: string }).widgetType;
    if (!widgetType) {
      editor.setTool('select');
      return;
    }

    const meta = editor.registry.widgets.get(widgetType) as
      | WidgetMeta
      | undefined;
    const size = meta?.defaultLayout ?? { width: 320, height: 200 };
    const defaultProps = (meta?.defaultProps as Record<string, unknown>) ?? {};

    const beforeIds = new Set(editor.getAllWidgets().map((w) => w.id));
    editor.addWidget(widgetType, {
      position: {
        x: ctx.pointer.canvas.x - size.width / 2,
        y: ctx.pointer.canvas.y - size.height / 2,
      },
      size,
      props: defaultProps,
    });
    // Find the newly added widget id.
    const newWidget = editor.getAllWidgets().find((w) => !beforeIds.has(w.id));

    if (!toolLocked) {
      editor.setTool('select');
      if (newWidget) editor.selectOne(newWidget.id);
    }
  },
};

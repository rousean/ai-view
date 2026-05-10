import * as React from 'react';
import type { Rect } from '@schema/types';
import { useDashboardEditor } from '../../editor/editor-context';

/**
 * Listens to `plugin.marquee.update` events from SelectTool and renders a
 * dashed selection rectangle. Coords are canvas-space.
 */
export const MarqueeOverlay: React.FC = () => {
  const editor = useDashboardEditor();
  const [rect, setRect] = React.useState<Rect | null>(null);

  React.useEffect(() => {
    return editor.bus.on(
      'plugin.marquee.update' as never,
      (payload: unknown) => {
        setRect((payload as Rect) ?? null);
      },
    );
  }, [editor]);

  if (!rect) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        background: 'rgba(91,141,239,0.08)',
        border: '1px dashed #5b8def',
        pointerEvents: 'none',
      }}
    />
  );
};

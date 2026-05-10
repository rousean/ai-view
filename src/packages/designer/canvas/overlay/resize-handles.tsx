import * as React from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { useResizeGesture } from '../interaction/use-resize-gesture';
import type { ResizeHandle } from '../transformer/geometry';

interface Props {
  bbox: { x: number; y: number; width: number; height: number };
}

/** 8 resize handles around a bounding box, drawn at constant screen size. */
export const ResizeHandles: React.FC<Props> = ({ bbox }) => {
  const start = useResizeGesture();
  const scale = useEditorStore((s) => s.camera.scale);
  // Each handle is 10×10 screen px regardless of zoom.
  const sz = 10 / scale;
  const half = sz / 2;

  const handles: Array<{
    handle: ResizeHandle;
    cx: number;
    cy: number;
    cursor: string;
  }> = [
    { handle: 'top-left', cx: bbox.x, cy: bbox.y, cursor: 'nwse-resize' },
    { handle: 'top', cx: bbox.x + bbox.width / 2, cy: bbox.y, cursor: 'ns-resize' },
    { handle: 'top-right', cx: bbox.x + bbox.width, cy: bbox.y, cursor: 'nesw-resize' },
    { handle: 'right', cx: bbox.x + bbox.width, cy: bbox.y + bbox.height / 2, cursor: 'ew-resize' },
    { handle: 'bottom-right', cx: bbox.x + bbox.width, cy: bbox.y + bbox.height, cursor: 'nwse-resize' },
    { handle: 'bottom', cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height, cursor: 'ns-resize' },
    { handle: 'bottom-left', cx: bbox.x, cy: bbox.y + bbox.height, cursor: 'nesw-resize' },
    { handle: 'left', cx: bbox.x, cy: bbox.y + bbox.height / 2, cursor: 'ew-resize' },
  ];

  return (
    <>
      {handles.map((h) => (
        <div
          key={h.handle}
          onPointerDown={(e) => start(h.handle, e)}
          style={{
            position: 'absolute',
            left: h.cx - half,
            top: h.cy - half,
            width: sz,
            height: sz,
            background: '#5b8def',
            border: `${1 / scale}px solid white`,
            borderRadius: 1.5 / scale,
            cursor: h.cursor,
            pointerEvents: 'auto',
            touchAction: 'none',
          }}
        />
      ))}
    </>
  );
};

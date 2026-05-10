import * as React from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { useResizeGesture } from '../interaction/use-resize-gesture';
import type { ResizeHandle } from '../transformer/geometry';

interface Props {
  bbox: { x: number; y: number; width: number; height: number };
  /**
   * Rotation of the chrome these handles belong to, in degrees CW.
   * Used to remap cursor icons so they match the screen-space direction
   * each handle is actually pointing in.
   */
  rotation?: number;
}

/** Outward direction (degrees CW from up = 0) of each handle's resize axis. */
const HANDLE_BASE_ANGLE: Record<ResizeHandle, number> = {
  top: 0,
  'top-right': 45,
  right: 90,
  'bottom-right': 135,
  bottom: 180,
  'bottom-left': 225,
  left: 270,
  'top-left': 315,
};

/**
 * Map an outward angle (degrees, any value) to the matching native resize
 * cursor. Cursors are 180°-symmetric, so we fold to [0, 180) before
 * choosing the nearest 45° wedge.
 */
function cursorForAngle(angleDeg: number): string {
  const a = ((angleDeg % 180) + 180) % 180;
  if (a < 22.5 || a >= 157.5) return 'ns-resize'; // ≈ 0° or 180°
  if (a < 67.5) return 'nesw-resize'; // ≈ 45°
  if (a < 112.5) return 'ew-resize'; // ≈ 90°
  return 'nwse-resize'; // ≈ 135°
}

/** 8 resize handles around a bounding box, drawn at constant screen size. */
export const ResizeHandles: React.FC<Props> = ({ bbox, rotation = 0 }) => {
  const start = useResizeGesture();
  const scale = useEditorStore((s) => s.camera.scale);
  // Each handle is 10×10 screen px regardless of zoom.
  const sz = 10 / scale;
  const half = sz / 2;

  const handles: Array<{
    handle: ResizeHandle;
    cx: number;
    cy: number;
  }> = [
    { handle: 'top-left', cx: bbox.x, cy: bbox.y },
    { handle: 'top', cx: bbox.x + bbox.width / 2, cy: bbox.y },
    { handle: 'top-right', cx: bbox.x + bbox.width, cy: bbox.y },
    { handle: 'right', cx: bbox.x + bbox.width, cy: bbox.y + bbox.height / 2 },
    { handle: 'bottom-right', cx: bbox.x + bbox.width, cy: bbox.y + bbox.height },
    { handle: 'bottom', cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height },
    { handle: 'bottom-left', cx: bbox.x, cy: bbox.y + bbox.height },
    { handle: 'left', cx: bbox.x, cy: bbox.y + bbox.height / 2 },
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
            cursor: cursorForAngle(HANDLE_BASE_ANGLE[h.handle] + rotation),
            pointerEvents: 'auto',
            touchAction: 'none',
          }}
        />
      ))}
    </>
  );
};
